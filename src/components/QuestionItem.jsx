import React from 'react';

export default function QuestionItem({ 
  question, 
  userAnswerState, 
  onSelectOption, 
  onCheckAnswer,
  isExamMode = false,
  isExamSubmitted = false
}) {
  const { id, questionText, imageUrl, options, correctAnswer, isCrucial } = question;
  const { userAnswer, isChecked } = userAnswerState || { userAnswer: null, isChecked: false };
  
  const showAnswers = isChecked || (isExamMode && isExamSubmitted);
  const isCorrect = userAnswer === correctAnswer;
  
  const optionLetters = ['A', 'B', 'C', 'D'];

  return (
    <div 
      id={`question-card-${id}`}
      className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-6 shadow-sm hover:shadow-md transition-all duration-200 scroll-mt-24"
    >
      {/* Card Header */}
      <div className="flex justify-between items-center mb-4">
        <div className="flex items-center gap-2">
          <span className="bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 font-extrabold text-sm px-3.5 py-1.5 rounded-full">
            Câu số {id}
          </span>
          {isCrucial && (
            <span className="bg-rose-100 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 font-black text-xs px-2.5 py-1.5 rounded-full uppercase tracking-wider animate-pulse border border-rose-200 dark:border-rose-900/40">
              Điểm Liệt
            </span>
          )}
        </div>
        
        {/* Status Badge */}
        {showAnswers ? (
          userAnswer === null ? (
            <span className="bg-slate-100 dark:bg-slate-700/50 text-slate-500 dark:text-slate-400 font-medium text-xs px-3 py-1 rounded-full">
              Bỏ qua
            </span>
          ) : isCorrect ? (
            <span className="bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 font-semibold text-xs px-3 py-1 rounded-full flex items-center gap-1">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12"></polyline>
              </svg>
              Đúng
            </span>
          ) : (
            <span className="bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 font-semibold text-xs px-3 py-1 rounded-full flex items-center gap-1">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="6" x2="6" y2="18"></line>
                <line x1="6" y1="6" x2="18" y2="18"></line>
              </svg>
              Sai
            </span>
          )
        ) : userAnswer !== null ? (
          <span className="bg-indigo-50 dark:bg-indigo-900/20 text-indigo-500 dark:text-indigo-400 font-medium text-xs px-3 py-1 rounded-full">
            {isExamMode ? 'Đã trả lời' : 'Đã chọn (Chưa kiểm tra)'}
          </span>
        ) : (
          <span className="bg-slate-100 dark:bg-slate-700/50 text-slate-500 dark:text-slate-400 font-medium text-xs px-3 py-1 rounded-full">
            Chưa trả lời
          </span>
        )}
      </div>

      {/* Question Text */}
      <h3 className="text-slate-800 dark:text-slate-100 font-bold text-lg leading-relaxed mb-4">
        {questionText}
      </h3>

      {/* Image if exists */}
      {imageUrl && (
        <div className="mb-5 overflow-hidden rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50 flex justify-center max-h-[300px]">
          <img 
            src={imageUrl} 
            alt={`Hình ảnh minh họa cho câu ${id}`}
            className="max-w-full h-auto object-contain hover:scale-[1.02] transition-transform duration-300"
            loading="lazy"
          />
        </div>
      )}

      {/* Options List */}
      <div className="flex flex-col gap-3 mb-5">
        {options.map((option, idx) => {
          let labelClasses = "relative flex items-center p-4 border rounded-xl cursor-pointer transition-all duration-150 select-none ";
          let markerClasses = "w-6 h-6 border rounded-full mr-3 flex items-center justify-center font-bold text-xs shrink-0 transition-colors duration-150 ";
          let textClasses = "text-sm font-medium transition-colors duration-150 ";
          let disabled = false;

          if (showAnswers) {
            disabled = true;
            if (idx === correctAnswer) {
              // Highlight the correct answer in green
              labelClasses += "border-emerald-500 bg-emerald-50 dark:bg-emerald-950/30 ";
              markerClasses += "border-emerald-500 bg-emerald-500 text-white ";
              textClasses += "text-emerald-700 dark:text-emerald-400 font-semibold ";
            } else if (idx === userAnswer) {
              // Highlight the incorrect chosen answer in red
              labelClasses += "border-rose-500 bg-rose-50 dark:bg-rose-950/30 ";
              markerClasses += "border-rose-500 bg-rose-500 text-white ";
              textClasses += "text-rose-700 dark:text-rose-400 font-semibold ";
            } else {
              labelClasses += "border-slate-200 dark:border-slate-700 opacity-60 cursor-not-allowed ";
              markerClasses += "border-slate-400 text-slate-400 dark:text-slate-500 ";
              textClasses += "text-slate-500 dark:text-slate-400 ";
            }
          } else {
            // Interactive state before checking
            if (idx === userAnswer) {
              labelClasses += "border-indigo-500 bg-indigo-50 dark:bg-indigo-950/20 ";
              markerClasses += "border-indigo-500 bg-indigo-500 text-white ";
              textClasses += "text-indigo-900 dark:text-indigo-200 font-semibold ";
            } else {
              labelClasses += "border-slate-200 dark:border-slate-700 hover:border-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700/30 ";
              markerClasses += "border-slate-300 dark:border-slate-600 text-slate-500 dark:text-slate-400 ";
              textClasses += "text-slate-600 dark:text-slate-300 ";
            }
          }

          return (
            <label 
              key={idx} 
              className={labelClasses}
              onClick={() => !disabled && onSelectOption(id, idx)}
            >
              <input 
                type="radio" 
                name={`question-${id}`}
                className="sr-only"
                checked={idx === userAnswer}
                disabled={disabled}
                onChange={() => {}} // Controlled via onClick on label
              />
              <span className={markerClasses}>
                {optionLetters[idx]}
              </span>
              <span className={textClasses}>
                {option}
              </span>
            </label>
          );
        })}
      </div>

      {/* Actions */}
      {!isExamMode && (
        <div className="flex items-center gap-3">
          <button
            onClick={() => onCheckAnswer(id)}
            disabled={userAnswer === null || isChecked}
            className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-200 dark:disabled:bg-slate-700 text-white disabled:text-slate-400 dark:disabled:text-slate-500 font-bold text-sm rounded-xl shadow-sm disabled:shadow-none hover:shadow-indigo-500/20 transition-all duration-150 disabled:cursor-not-allowed"
          >
            Kiểm tra câu này
          </button>
        </div>
      )}

      {/* Immediate Feedback Box */}
      {showAnswers && (
        <div className={`mt-4 p-4 rounded-xl border flex items-start gap-3 animate-[fadeIn_0.2s_ease-out] ${
          isCorrect && userAnswer !== null
            ? 'bg-emerald-50 dark:bg-emerald-950/20 border-emerald-500 text-emerald-800 dark:text-emerald-300' 
            : 'bg-rose-50 dark:bg-rose-950/20 border-rose-500 text-rose-800 dark:text-rose-300'
        }`}>
          <span className="text-xl shrink-0 mt-0.5">
            {isCorrect && userAnswer !== null ? '🎉' : '💡'}
          </span>
          <div className="text-sm leading-relaxed">
            {isCorrect && userAnswer !== null ? (
              <div>
                <strong>Chính xác!</strong> Bạn đã trả lời đúng câu hỏi này.
              </div>
            ) : userAnswer === null ? (
              <div>
                <strong>Bỏ qua!</strong> Bạn chưa trả lời câu hỏi này trong bài thi. Đáp án đúng là <strong>{optionLetters[correctAnswer]}</strong>: "{options[correctAnswer]}"
              </div>
            ) : (
              <div>
                <strong>Chưa chính xác!</strong> Đáp án đúng phải là <strong>{optionLetters[correctAnswer]}</strong>: "{options[correctAnswer]}"
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
