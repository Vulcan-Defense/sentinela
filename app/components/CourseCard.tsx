import React from "react";
import { Course } from "../data/site-catalog";

interface CourseCardProps {
  course: Course;
  onSelect: (courseId: string) => void;
  selectedCourseId?: string;
  completedModules: string[];
}

export function CourseCard({ course, onSelect, selectedCourseId, completedModules }: CourseCardProps) {
  const isSelected = selectedCourseId === course.id;
  const completedCount = course.modules.filter(m => completedModules.includes(m.id)).length;
  const progress = course.modules.length > 0 ? (completedCount / course.modules.length) * 100 : 0;

  return (
    <div 
      className={\`group relative flex h-[140px] w-full rounded-xl border border-gray-200 bg-white p-4 transition-all hover:shadow-md hover:border-gray-300 cursor-pointer ${isSelected ? "ring-2 ring-primary/50" : ""}\`}
      onClick={() => onSelect(course.id)}
    >
      <div className="flex items-start gap-4">
        <div className="flex-shrink-0 h-10 w-10 bg-primary/10 rounded-lg flex items-center justify-center text-primary">
          <span className="text-sm">📚\</span>
        </div>
        
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-lg line-clamp-1">
            {course.title}
          </h3>
          <p className="mt-1 text-sm text-gray-600 line-clamp-2">
            {course.description}
          </p>
          
          <div className="mt-3 flex-1">
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div 
                className={\`h-2 bg-primary rounded-full transition-all duration-500\`} 
                style={{ width: \`${progress}%\` }}
              ></div>
            </div>
            <div className="flex justify-between text-sm text-gray-500 mt-1">
              <span>{completedCount} de {course.modules.length} módulos</span>
              <span>${Math.round(progress)}% concluído</span>
            </div>
          </div>
        </div>
        
        <div className="flex-shrink-0 flex items-center justify-center h-10 w-10 text-gray-400 group-hover:text-gray-600 transition-colors">
          <span className="text-sm">▶</span>
        </div>
      </div>
    </div>
  );
}
