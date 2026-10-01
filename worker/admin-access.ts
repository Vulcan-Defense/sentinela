import { resolveAuthIdentity, type ManualAuthEnv } from "./manual-auth";
import { mysqlConfigured, withMysql, type MysqlDb } from "./mysql";

async function ensureTables(db:MysqlDb){
  await db.execute(`CREATE TABLE IF NOT EXISTS access_codes (id VARCHAR(64) PRIMARY KEY,code VARCHAR(80) NOT NULL UNIQUE,active TINYINT(1) NOT NULL DEFAULT 1,max_uses INT NULL,uses_count INT NOT NULL DEFAULT 0,expires_at VARCHAR(40) NULL,created_at VARCHAR(40) NOT NULL,created_by VARCHAR(128) NOT NULL) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`);
  await db.execute(`CREATE TABLE IF NOT EXISTS coupons (id VARCHAR(64) PRIMARY KEY,code VARCHAR(80) NOT NULL UNIQUE,discount_percent INT NOT NULL,active TINYINT(1) NOT NULL DEFAULT 1,max_uses INT NULL,uses_count INT NOT NULL DEFAULT 0,expires_at VARCHAR(40) NULL,created_at VARCHAR(40) NOT NULL,created_by VARCHAR(128) NOT NULL) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`);
}
function cleanCode(value:unknown){return String(value??"").trim().toUpperCase().replace(/[^A-Z0-9_-]/g,"").slice(0,80)}
export async function handleAdminAccess(request:Request,env:ManualAuthEnv):Promise<Response|null>{
  const url=new URL(request.url);if(url.pathname!=="/api/admin/access-management")return null;
  const identity=await resolveAuthIdentity(request,env);if(!identity?.userId)return Response.json({error:"Autenticação obrigatória."},{status:401});
  if(!mysqlConfigured(env))return Response.json({error:"MySQL indisponível."},{status:503});
  const allowed=await withMysql(env,async db=>(await db.query<{systemRole:string}>("SELECT system_role AS systemRole FROM accounts WHERE user_id=? LIMIT 1",[identity.userId]))[0]?.systemRole==="admin");
  if(!allowed)return Response.json({error:"Apenas administradores podem gerenciar acessos."},{status:403});
  const origin=request.headers.get("origin");if(origin&&origin!==url.origin)return Response.json({error:"Origem inválida."},{status:403});
  try{
    return await withMysql(env,async db=>{
      await ensureTables(db);
      if(request.method==="GET"){
        const accessCodes=await db.query("SELECT id,code,active,max_uses AS maxUses,uses_count AS usesCount,expires_at AS expiresAt,created_at AS createdAt FROM access_codes ORDER BY created_at DESC");
        const coupons=await db.query("SELECT id,code,discount_percent AS discountPercent,active,max_uses AS maxUses,uses_count AS usesCount,expires_at AS expiresAt,created_at AS createdAt FROM coupons ORDER BY created_at DESC");
        return Response.json({accessCodes,coupons});
      }
      const body=await request.json() as {kind?:"access"|"coupon";id?:string;code?:string;active?:boolean;discountPercent?:number;maxUses?:number|null;expiresAt?:string|null};
      const table=body.kind==="coupon"?"coupons":body.kind==="access"?"access_codes":null;if(!table)return Response.json({error:"Tipo inválido."},{status:400});
      if(request.method==="POST"){
        const code=cleanCode(body.code);if(code.length<4)return Response.json({error:"Informe um código com pelo menos 4 caracteres."},{status:400});
        const id=crypto.randomUUID(),now=new Date().toISOString(),maxUses=body.maxUses&&body.maxUses>0?Math.floor(body.maxUses):null,expiresAt=body.expiresAt?new Date(body.expiresAt).toISOString():null;
        if(table==="coupons"){
          const discount=Math.floor(Number(body.discountPercent));if(discount<1||discount>100)return Response.json({error:"Desconto deve ficar entre 1% e 100%."},{status:400});
          await db.execute("INSERT INTO coupons (id,code,discount_percent,max_uses,expires_at,created_at,created_by) VALUES (?,?,?,?,?,?,?)",[id,code,discount,maxUses,expiresAt,now,identity.userId]);
        }else await db.execute("INSERT INTO access_codes (id,code,max_uses,expires_at,created_at,created_by) VALUES (?,?,?,?,?,?)",[id,code,maxUses,expiresAt,now,identity.userId]);
        return Response.json({created:true,id},{status:201});
      }
      if(request.method==="PATCH"&&body.id){await db.execute(`UPDATE ${table} SET active=? WHERE id=?`,[body.active?1:0,body.id]);return Response.json({updated:true});}
      if(request.method==="DELETE"&&body.id){await db.execute(`DELETE FROM ${table} WHERE id=?`,[body.id]);return Response.json({deleted:true});}
      return Response.json({error:"Alteração inválida."},{status:400});
    });
  }catch(error){console.error("admin-access",error);return Response.json({error:"Não foi possível concluir a gestão de acessos."},{status:500});}
}
