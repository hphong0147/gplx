import React, { useEffect, useRef } from 'react';

export default function ResultsModal({ 
  isOpen, 
  onClose, 
  onReset, 
  stats 
}) {
  const { total, completed, correct, incorrect, skipped, scorePercentage, hasCrucialError } = stats;
  const canvasRef = useRef(null);
  const animationRef = useRef(null);

  // Canvas Confetti effect when user passes
  useEffect(() => {
    if (!isOpen || scorePercentage < 80 || hasCrucialError || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    
    const resizeCanvas = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    let particles = [];
    const colors = ['#6366f1', '#10b981', '#ef4444', '#fbbf24', '#f43f5e', '#3b82f6'];
    
    for (let i = 0; i < 150; i++) {
      particles.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height - canvas.height,
        r: Math.random() * 6 + 4,
        d: Math.random() * canvas.height,
        color: colors[Math.floor(Math.random() * colors.length)],
        tilt: Math.random() * 10 - 5,
        tiltAngleIncremental: Math.random() * 0.07 + 0.02,
        tiltAngle: 0
      });
    }

    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      particles.forEach((p, idx) => {
        p.tiltAngle += p.tiltAngleIncremental;
        p.y += (Math.cos(p.d) + 3 + p.r / 2) / 2;
        p.x += Math.sin(p.tiltAngle);
        p.tilt = Math.sin(p.tiltAngle - idx / 3) * 15;
        
        ctx.beginPath();
        ctx.lineWidth = p.r;
        ctx.strokeStyle = p.color;
        ctx.moveTo(p.x + p.tilt + p.r / 2, p.y);
        ctx.lineTo(p.x + p.tilt, p.y + p.tilt + p.r / 2);
        ctx.stroke();

        // Recycle particle if it falls off screen
        if (p.y > canvas.height) {
          p.x = Math.random() * canvas.width;
          p.y = -20;
          p.tilt = Math.random() * 10 - 5;
        }
      });

      animationRef.current = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      window.removeEventListener('resize', resizeCanvas);
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [isOpen, scorePercentage, hasCrucialError]);

  if (!isOpen) return null;

  const isPassed = scorePercentage >= 80 && !hasCrucialError;
  const circumference = 440; // 2 * pi * r (r=70)
  const strokeDashoffset = circumference - (scorePercentage / 100) * circumference;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Confetti Canvas */}
      {isPassed && (
        <canvas 
          ref={canvasRef} 
          className="absolute inset-0 pointer-events-none z-10 w-full h-full"
        />
      )}

      {/* Backdrop Overlay */}
      <div 
        className="absolute inset-0 bg-slate-900/60 backdrop-blur-md transition-opacity duration-300"
        onClick={onClose}
      />

      {/* Modal Container */}
      <div className="relative bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-3xl p-8 max-w-lg w-full shadow-2xl text-center z-20 max-h-[90vh] overflow-y-auto transform transition-all duration-300 animate-[scaleUp_0.3s_cubic-bezier(0.34,1.56,0.64,1)]">
        <h2 className="text-3xl font-extrabold mb-6 bg-gradient-to-r from-indigo-500 to-emerald-500 bg-clip-text text-transparent">
          Kết Quả Bài Thi
        </h2>

        {/* Circular Progress Score Card */}
        <div className="relative w-40 h-40 mx-auto mb-6">
          <svg className="w-full h-full -rotate-90">
            <circle 
              className="text-slate-100 dark:text-slate-700 fill-none stroke-current" 
              strokeWidth="10" 
              cx="80" 
              cy="80" 
              r="70"
            />
            <circle 
              className={`${isPassed ? 'text-emerald-500' : 'text-rose-500'} fill-none stroke-current transition-all duration-1000 ease-out`} 
              strokeWidth="10" 
              strokeDasharray={circumference}
              strokeDashoffset={strokeDashoffset}
              strokeLinecap="round"
              cx="80" 
              cy="80" 
              r="70"
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-3xl font-black text-slate-800 dark:text-slate-100">
              {scorePercentage}%
            </span>
            <span className="text-xs font-bold text-slate-400 dark:text-slate-500 mt-1">
              {correct} / {total} câu
            </span>
          </div>
        </div>

        {/* Passed/Failed Status Banner */}
        <div className={`p-3.5 rounded-xl font-bold text-base mb-6 border ${
          isPassed 
            ? 'bg-emerald-50 dark:bg-emerald-950/20 border-emerald-500 text-emerald-700 dark:text-emerald-400' 
            : 'bg-rose-50 dark:bg-rose-950/20 border-rose-500 text-rose-700 dark:text-rose-400'
        }`}>
          {isPassed 
            ? '🎉 ĐẠT - HOÀN THÀNH XUẤT SẮC!' 
            : hasCrucialError 
              ? '⚠️ CHƯA ĐẠT - SAI CÂU ĐIỂM LIỆT!' 
              : '⚠️ CHƯA ĐẠT - HÃY ÔN LUYỆN THÊM!'}
        </div>

        {/* Statistics Grid */}
        <div className="grid grid-cols-2 gap-4 mb-8">
          <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50 text-left">
            <div className="flex justify-between items-center mb-1">
              <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Tổng số câu hỏi</span>
              <span className="text-xl font-black text-slate-800 dark:text-slate-100">{total}</span>
            </div>
            <span className="text-[10px] text-slate-400">Tổng số câu của đề thi</span>
          </div>

          <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50 text-left">
            <div className="flex justify-between items-center mb-1">
              <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Đã kiểm tra</span>
              <span className="text-xl font-black text-amber-500">{completed}</span>
            </div>
            <span className="text-[10px] text-slate-400">Số câu đã bấm kiểm tra</span>
          </div>

          <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50 text-left">
            <div className="flex justify-between items-center mb-1">
              <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Trả lời ĐÚNG</span>
              <span className="text-xl font-black text-emerald-500">{correct}</span>
            </div>
            <span className="text-[10px] text-slate-400">Số câu đạt điểm tối đa</span>
          </div>

          <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50 text-left">
            <div className="flex justify-between items-center mb-1">
              <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Trả lời SAI</span>
              <span className="text-xl font-black text-rose-500">{incorrect}</span>
            </div>
            <span className="text-[10px] text-slate-400">Số câu trả lời sai</span>
          </div>

          <div className="col-span-2 p-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50 text-left">
            <div className="flex justify-between items-center mb-1">
              <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Bỏ qua / Chưa làm</span>
              <span className="text-xl font-black text-slate-500 dark:text-slate-400">{skipped}</span>
            </div>
            <span className="text-[10px] text-slate-400">Số câu chưa hoàn tất nộp điểm</span>
          </div>
        </div>

        {/* Modal Buttons */}
        <div className="flex gap-4">
          <button
            onClick={onClose}
            className="flex-1 py-3 px-5 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700/50 text-slate-700 dark:text-slate-200 font-bold text-sm rounded-xl transition-all duration-150"
          >
            Xem lại bài làm
          </button>
          <button
            onClick={onReset}
            className="flex-1 py-3 px-5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm rounded-xl shadow-lg shadow-emerald-600/20 hover:shadow-emerald-600/30 transition-all duration-150"
          >
            Làm bài thi mới
          </button>
        </div>
      </div>
    </div>
  );
}
