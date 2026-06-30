import React, { useState, useEffect, useRef } from 'react';
import { questionBank } from './data/questions';
import QuestionItem from './components/QuestionItem';
import ResultsModal from './components/ResultsModal';

export default function App() {
  // --- States ---
  const [answers, setAnswers] = useState(() => {
    const saved = localStorage.getItem('react-quiz-answers');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed && Object.keys(parsed).length === questionBank.length) {
          return parsed;
        }
      } catch (e) {
        console.error(e);
      }
    }
    // Default answers state
    const defaultAnswers = {};
    questionBank.forEach(q => {
      defaultAnswers[q.id] = {
        userAnswer: null,
        isChecked: false,
        isCorrect: false
      };
    });
    return defaultAnswers;
  });

  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [viewMode, setViewMode] = useState('single'); // 'single' | 'list'
  const [filterMode, setFilterMode] = useState('all'); // 'all' | 'unanswered' | 'correct' | 'incorrect'
  const [theme, setTheme] = useState(() => localStorage.getItem('react-quiz-theme') || 'light');
  const [isResultsOpen, setIsResultsOpen] = useState(false);
  const [toast, setToast] = useState(null);
  const [resetConfirm, setResetConfirm] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // --- New Exam Mode States ---
  const [activeTab, setActiveTab] = useState('practice'); // 'practice' | 'exam'
  const [examActive, setExamActive] = useState(false);
  const [examQuestions, setExamQuestions] = useState([]);
  const [examAnswers, setExamAnswers] = useState({});
  const [examLicenseClass, setExamLicenseClass] = useState('A1'); // 'A1' | 'A'
  const [examTimeRemaining, setExamTimeRemaining] = useState(19 * 60);
  const [examSubmitted, setExamSubmitted] = useState(false);
  const [examReviewMode, setExamReviewMode] = useState(false);
  const [examCurrentIndex, setExamCurrentIndex] = useState(0);
  const [submitConfirm, setSubmitConfirm] = useState(false);

  const examCanvasRef = useRef(null);
  const examAnimationRef = useRef(null);

  const itemsPerPage = 5; // Questions per page in list mode

  // --- Effects ---
  // Sync answers to localStorage
  useEffect(() => {
    localStorage.setItem('react-quiz-answers', JSON.stringify(answers));
  }, [answers]);

  // Sync theme to document element & localStorage
  useEffect(() => {
    localStorage.setItem('react-quiz-theme', theme);
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [theme]);

  // Auto dismiss toast
  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(null), 3000);
    return () => clearTimeout(timer);
  }, [toast]);

  // Auto reset confirmation after 3s
  useEffect(() => {
    if (!resetConfirm) return;
    const timer = setTimeout(() => setResetConfirm(false), 3000);
    return () => clearTimeout(timer);
  }, [resetConfirm]);

  // Auto reset submit confirmation after 3s
  useEffect(() => {
    if (!submitConfirm) return;
    const timer = setTimeout(() => setSubmitConfirm(false), 3000);
    return () => clearTimeout(timer);
  }, [submitConfirm]);

  // Exam countdown timer
  useEffect(() => {
    if (!examActive || examSubmitted) return;
    const timer = setInterval(() => {
      setExamTimeRemaining(prev => {
        if (prev <= 1) {
          clearInterval(timer);
          // Auto submit
          setExamActive(false);
          setExamSubmitted(true);
          setExamReviewMode(false);
          showToast('Hết giờ làm bài! Bài thi đã tự động được nộp.');
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [examActive, examSubmitted]);

  // Canvas confetti effect for exam passing results
  useEffect(() => {
    if (activeTab !== 'exam' || !examSubmitted || !examStats?.isPassed || !examCanvasRef.current) return;

    const canvas = examCanvasRef.current;
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

        if (p.y > canvas.height) {
          p.x = Math.random() * canvas.width;
          p.y = -20;
          p.tilt = Math.random() * 10 - 5;
        }
      });

      examAnimationRef.current = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      window.removeEventListener('resize', resizeCanvas);
      if (examAnimationRef.current) {
        cancelAnimationFrame(examAnimationRef.current);
      }
    };
  }, [activeTab, examSubmitted, examQuestions]);

  // --- Helpers ---
  const showToast = (message) => {
    setToast(message);
  };

  const handleToggleTheme = () => {
    const nextTheme = theme === 'light' ? 'dark' : 'light';
    setTheme(nextTheme);
    showToast(`Đã chuyển sang chế độ ${nextTheme === 'dark' ? 'Tối' : 'Sáng'}`);
  };

  const handleSelectOption = (questionId, optionIdx) => {
    setAnswers(prev => ({
      ...prev,
      [questionId]: {
        ...prev[questionId],
        userAnswer: optionIdx
      }
    }));
  };

  const handleCheckAnswer = (questionId) => {
    const q = questionBank.find(item => item.id === questionId);
    const userAns = answers[questionId].userAnswer;
    const isCorrect = userAns === q.correctAnswer;

    setAnswers(prev => ({
      ...prev,
      [questionId]: {
        ...prev[questionId],
        isChecked: true,
        isCorrect
      }
    }));
  };

  const handleResetQuiz = () => {
    if (!resetConfirm) {
      setResetConfirm(true);
      showToast('Nhấn "Làm mới/Làm lại" một lần nữa để xác nhận xóa toàn bộ lịch sử làm bài.');
      return;
    }
    setResetConfirm(false);
    const resetAnswers = {};
    questionBank.forEach(q => {
      resetAnswers[q.id] = {
        userAnswer: null,
        isChecked: false,
        isCorrect: false
      };
    });
    setAnswers(resetAnswers);
    setCurrentQuestionIndex(0);
    setCurrentPage(1);
    setFilterMode('all');
    setSearchQuery('');
    setIsResultsOpen(false);
    showToast('Đã làm mới toàn bộ bài thi!');
  };

  const handleForceReset = () => {
    // Used inside the results modal (without double prompt)
    const resetAnswers = {};
    questionBank.forEach(q => {
      resetAnswers[q.id] = {
        userAnswer: null,
        isChecked: false,
        isCorrect: false
      };
    });
    setAnswers(resetAnswers);
    setCurrentQuestionIndex(0);
    setCurrentPage(1);
    setFilterMode('all');
    setSearchQuery('');
    setIsResultsOpen(false);
    showToast('Bắt đầu bài thi mới!');
  };

  // Filter logic
  const getFilteredQuestions = () => {
    return questionBank.filter(q => {
      // Filter by search query
      if (searchQuery.trim() !== '') {
        const query = searchQuery.toLowerCase().trim();
        const matchesText = q.questionText.toLowerCase().includes(query);
        const matchesId = q.id.toString() === query;
        if (!matchesText && !matchesId) return false;
      }

      const state = answers[q.id];
      if (filterMode === 'all') return true;
      if (filterMode === 'unanswered') return !state.isChecked;
      if (filterMode === 'correct') return state.isChecked && state.isCorrect;
      if (filterMode === 'incorrect') return state.isChecked && !state.isCorrect;
      return true;
    });
  };

  const filteredQuestions = getFilteredQuestions();

  // Jump to specific question
  const jumpToQuestion = (questionId) => {
    // Reset filter and search to show the target question
    setFilterMode('all');
    setSearchQuery('');
    
    // Find index in overall questions list
    const indexInAll = questionBank.findIndex(q => q.id === questionId);
    if (indexInAll === -1) return;

    if (viewMode === 'single') {
      setCurrentQuestionIndex(indexInAll);
      showToast(`Đã chuyển tới Câu ${questionId}`);
    } else {
      // List mode: calculate page
      const pageIndex = Math.floor(indexInAll / itemsPerPage) + 1;
      setCurrentPage(pageIndex);
      showToast(`Đã chuyển tới Trang ${pageIndex}`);
      
      // Scroll to element after page updates
      setTimeout(() => {
        const el = document.getElementById(`question-card-${questionId}`);
        if (el) {
          el.scrollIntoView({ behavior: 'smooth', block: 'start' });
          // Flash effect
          el.classList.add('ring-4', 'ring-indigo-500/20');
          setTimeout(() => el.classList.remove('ring-4', 'ring-indigo-500/20'), 1500);
        }
      }, 100);
    }
  };

  // Submit and open statistics modal
  const handleSubmitQuiz = () => {
    // Automatically grade any selected but unchecked answers
    setAnswers(prev => {
      const next = { ...prev };
      questionBank.forEach(q => {
        const state = next[q.id];
        if (state && state.userAnswer !== null && !state.isChecked) {
          next[q.id] = {
            ...state,
            isChecked: true,
            isCorrect: state.userAnswer === q.correctAnswer
          };
        }
      });
      return next;
    });
    setIsResultsOpen(true);
  };

  // Calculate stats for header and modal
  const getStats = () => {
    const total = questionBank.length;
    const answeredCount = Object.values(answers).filter(a => a.userAnswer !== null).length;
    const checkedCount = Object.values(answers).filter(a => a.isChecked).length;
    const correctCount = Object.values(answers).filter(a => a.isChecked && a.isCorrect).length;
    const incorrectCount = Object.values(answers).filter(a => a.isChecked && !a.isCorrect).length;
    const skippedCount = total - checkedCount;
    const scorePercentage = total > 0 ? Math.round((correctCount / total) * 100) : 0;

    // Check if any crucial question is answered wrong
    let hasCrucialError = false;
    questionBank.forEach(q => {
      if (q.isCrucial) {
        const state = answers[q.id];
        if (state && state.isChecked && !state.isCorrect) {
          hasCrucialError = true;
        }
      }
    });

    return {
      total,
      completed: checkedCount,
      correct: correctCount,
      incorrect: incorrectCount,
      skipped: skippedCount,
      scorePercentage,
      hasCrucialError
    };
  };

  const stats = getStats();

  // --- New Exam Mode Helpers ---
  const handleStartExam = (licenseClass) => {
    setExamLicenseClass(licenseClass);
    
    // Sample questions: exactly 3 crucial and 22 non-crucial questions
    const allCrucial = questionBank.filter(q => q.isCrucial);
    const allNonCrucial = questionBank.filter(q => !q.isCrucial);

    const shuffledCrucial = [...allCrucial].sort(() => 0.5 - Math.random());
    const selectedCrucial = shuffledCrucial.slice(0, 3);

    const shuffledNonCrucial = [...allNonCrucial].sort(() => 0.5 - Math.random());
    const selectedNonCrucial = shuffledNonCrucial.slice(0, 22);

    const examSet = [...selectedCrucial, ...selectedNonCrucial].sort((a, b) => a.id - b.id);
    
    const initAnswers = {};
    examSet.forEach(q => {
      initAnswers[q.id] = { userAnswer: null, isChecked: false, isCorrect: false };
    });

    setExamQuestions(examSet);
    setExamAnswers(initAnswers);
    setExamTimeRemaining(19 * 60);
    setExamActive(true);
    setExamSubmitted(false);
    setExamReviewMode(false);
    setExamCurrentIndex(0);
    setSubmitConfirm(false);
    showToast(`Bắt đầu bài thi hạng ${licenseClass}! Thời gian: 19 phút.`);
  };

  const handleSelectExamOption = (questionId, optionIdx) => {
    if (examSubmitted && !examReviewMode) return;
    setExamAnswers(prev => ({
      ...prev,
      [questionId]: {
        ...prev[questionId],
        userAnswer: optionIdx
      }
    }));
  };

  const handleSelectSubmitExam = () => {
    const unansweredCount = examQuestions.filter(q => examAnswers[q.id]?.userAnswer === null).length;
    
    if (!submitConfirm) {
      setSubmitConfirm(true);
      if (unansweredCount > 0) {
        showToast(`Bạn còn ${unansweredCount} câu chưa trả lời. Nhấn "Nộp bài" một lần nữa để xác nhận.`);
      } else {
        showToast('Nhấn "Nộp bài" một lần nữa để xác nhận nộp bài thi.');
      }
      return;
    }
    
    setSubmitConfirm(false);
    setExamActive(false);
    setExamSubmitted(true);
    setExamReviewMode(false);
    showToast('Đã nộp bài thi thành công!');
  };

  const handleCancelExam = () => {
    if (window.confirm('Bạn có chắc chắn muốn hủy bài thi này không? Tiến độ hiện tại sẽ bị xóa.')) {
      setExamActive(false);
      setExamSubmitted(false);
      setExamReviewMode(false);
      setExamQuestions([]);
      setExamAnswers({});
      showToast('Đã hủy bài thi.');
    }
  };

  const handleForceResetExam = () => {
    handleStartExam(examLicenseClass);
  };

  const getExamStats = () => {
    if (examQuestions.length === 0) return null;
    
    let correctCount = 0;
    let incorrectCount = 0;
    let skippedCount = 0;
    let hasCrucialError = false;

    examQuestions.forEach(q => {
      const state = examAnswers[q.id];
      const ans = state ? state.userAnswer : null;
      if (ans === null) {
        skippedCount++;
        if (q.isCrucial) {
          hasCrucialError = true;
        }
      } else if (ans === q.correctAnswer) {
        correctCount++;
      } else {
        incorrectCount++;
        if (q.isCrucial) {
          hasCrucialError = true;
        }
      }
    });

    const total = examQuestions.length;
    const passingScore = examLicenseClass === 'A1' ? 21 : 23;
    const isPassed = correctCount >= passingScore && !hasCrucialError;

    return {
      total,
      correct: correctCount,
      incorrect: incorrectCount,
      skipped: skippedCount,
      hasCrucialError,
      isPassed,
      passingScore,
      scorePercentage: Math.round((correctCount / total) * 100),
      timeUsed: 19 * 60 - examTimeRemaining
    };
  };

  const examStats = getExamStats();

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // --- Rendering subparts ---
  const renderPagination = (totalPages) => {
    const pages = [];
    for (let i = 1; i <= totalPages; i++) {
      if (i === 1 || i === totalPages || (i >= currentPage - 1 && i <= currentPage + 1)) {
        pages.push(
          <button
            key={i}
            onClick={() => {
              setCurrentPage(i);
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
            className={`w-10 h-10 font-bold rounded-lg transition-all duration-150 ${
              currentPage === i
                ? 'bg-indigo-600 text-white'
                : 'bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700'
            }`}
          >
            {i}
          </button>
        );
      } else if (i === currentPage - 2 || i === currentPage + 2) {
        pages.push(
          <span key={`ellipsis-${i}`} className="px-1 text-slate-400 dark:text-slate-500">
            ...
          </span>
        );
      }
    }

    return (
      <div className="flex justify-center items-center gap-1.5 mt-8 p-4 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl">
        <button
          onClick={() => {
            if (currentPage > 1) {
              setCurrentPage(currentPage - 1);
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }
          }}
          disabled={currentPage === 1}
          className="w-10 h-10 flex items-center justify-center font-bold bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-white"
        >
          &laquo;
        </button>
        {pages}
        <button
          onClick={() => {
            if (currentPage < totalPages) {
              setCurrentPage(currentPage + 1);
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }
          }}
          disabled={currentPage === totalPages}
          className="w-10 h-10 flex items-center justify-center font-bold bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-white"
        >
          &raquo;
        </button>
      </div>
    );
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-slate-100 transition-colors duration-200">
      
      {/* HEADER NAVBAR */}
      <header className="sticky top-0 z-40 bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 shadow-sm transition-colors duration-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex flex-col sm:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-indigo-700 rounded-xl flex items-center justify-center text-white font-extrabold text-lg shadow-lg shadow-indigo-500/25">
              Q
            </div>
            <div>
              <h1 className="text-lg font-bold tracking-tight">Hệ Thống Trắc Nghiệm</h1>
              <p className="text-xs text-slate-400 dark:text-slate-500 font-medium">Lý thuyết lái xe A1/A2 • 250 Câu hỏi</p>
            </div>
          </div>

          {/* Quick Header Stats */}
          {activeTab === 'practice' && (
            <div className="flex items-center gap-6 animate-[fadeIn_0.2s_ease-out]">
              <div className="text-right">
                <span className="block text-[10px] text-slate-400 dark:text-slate-500 font-bold uppercase tracking-wider">Tiến độ</span>
                <span className="text-sm font-extrabold text-slate-700 dark:text-slate-200">{stats.completed}/{stats.total}</span>
              </div>
              <div className="text-right border-l border-slate-200 dark:border-slate-700 pl-6">
                <span className="block text-[10px] text-slate-400 dark:text-slate-500 font-bold uppercase tracking-wider text-emerald-500">Đúng</span>
                <span className="text-sm font-extrabold text-emerald-500">{stats.correct}</span>
              </div>
              <div className="text-right border-l border-slate-200 dark:border-slate-700 pl-6">
                <span className="block text-[10px] text-slate-400 dark:text-slate-500 font-bold uppercase tracking-wider text-rose-500">Sai</span>
                <span className="text-sm font-extrabold text-rose-500">{stats.incorrect}</span>
              </div>
            </div>
          )}

          {/* Action buttons */}
          <div className="flex items-center gap-2">
            <button
              onClick={handleToggleTheme}
              className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 transition-colors"
              title="Chuyển chế độ sáng/tối"
            >
              {theme === 'light' ? (
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
                </svg>
              ) : (
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364-6.364l-.707.707M6.343 17.657l-.707.707m0-12.728l.707.707m12.728 12.728l.707-.707M12 8a4 4 0 100 8 4 4 0 000-8z" />
                </svg>
              )}
            </button>
            {activeTab === 'practice' && (
              <button
                onClick={handleResetQuiz}
                className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 border border-transparent text-slate-700 dark:text-slate-200 text-sm font-bold rounded-xl transition-all"
              >
                Làm mới
              </button>
            )}
          </div>
        </div>

        {/* Global Progress Bar Fill */}
        {activeTab === 'practice' && (
          <div className="w-full h-1 bg-slate-100 dark:bg-slate-700 relative overflow-hidden">
            <div 
              className="h-full bg-gradient-to-r from-indigo-500 via-indigo-600 to-emerald-500 transition-all duration-300 ease-out" 
              style={{ width: `${stats.total > 0 ? (stats.completed / stats.total) * 100 : 0}%` }}
            />
          </div>
        )}
      </header>

      {/* MAIN CONTAINER */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        
        {/* Tab Switcher (only show when not actively taking an exam) */}
        {(!examActive || examSubmitted) && (
          <div className="mb-6 flex justify-center">
            <div className="bg-slate-200/80 dark:bg-slate-800 p-1.5 rounded-2xl flex gap-1 border border-slate-300/30 dark:border-slate-700/50 shadow-inner">
              <button
                onClick={() => setActiveTab('practice')}
                className={`px-6 py-2.5 rounded-xl font-bold text-sm transition-all duration-200 flex items-center gap-2 ${
                  activeTab === 'practice'
                    ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 shadow-md shadow-indigo-600/5'
                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300'
                }`}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 20h9"></path>
                  <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path>
                </svg>
                Luyện Tập (250 Câu)
              </button>
              <button
                onClick={() => {
                  setActiveTab('exam');
                  setSubmitConfirm(false);
                }}
                className={`px-6 py-2.5 rounded-xl font-bold text-sm transition-all duration-200 flex items-center gap-2 ${
                  activeTab === 'exam'
                    ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 shadow-md shadow-indigo-600/5'
                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300'
                }`}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10"></circle>
                  <polyline points="12 6 12 12 16 14"></polyline>
                </svg>
                Thi Sát Hạch (25 Câu)
              </button>
            </div>
          </div>
        )}

        {activeTab === 'practice' ? (
          // ==================== TAB 1: PRACTICE MODE ====================
          <div className="grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-6">

            {/* LEFT COLUMN: Controls + Questions */}
            <div className="flex flex-col gap-6">
              
              {/* Filter and View mode switcher toolbar */}
              <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-4 flex flex-col md:flex-row justify-between items-center gap-4 shadow-sm">
                <div className="flex flex-wrap gap-2 w-full md:w-auto">
                  {[
                    { id: 'all', label: 'Tất cả' },
                    { id: 'unanswered', label: 'Chưa làm' },
                    { id: 'correct', label: 'Đã đúng' },
                    { id: 'incorrect', label: 'Đã sai' }
                  ].map(f => (
                    <button
                      key={f.id}
                      onClick={() => {
                        setFilterMode(f.id);
                        setCurrentPage(1);
                        setCurrentQuestionIndex(0);
                      }}
                      className={`px-4 py-2 rounded-full font-bold text-xs transition-all duration-150 ${
                        filterMode === f.id
                          ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/15'
                          : 'bg-slate-50 dark:bg-slate-700/50 border border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600 text-slate-600 dark:text-slate-300'
                      }`}
                    >
                      {f.label}
                    </button>
                  ))}
                </div>

                {/* View Switcher */}
                <div className="bg-slate-100 dark:bg-slate-900 p-1 rounded-xl flex border border-slate-200 dark:border-slate-700/50">
                  <button
                    onClick={() => setViewMode('single')}
                    className={`px-4 py-2 rounded-lg font-bold text-xs transition-all ${
                      viewMode === 'single'
                        ? 'bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 shadow-sm'
                        : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
                    }`}
                  >
                    Từng câu
                  </button>
                  <button
                    onClick={() => setViewMode('list')}
                    className={`px-4 py-2 rounded-lg font-bold text-xs transition-all ${
                      viewMode === 'list'
                        ? 'bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 shadow-sm'
                        : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
                    }`}
                  >
                    Danh sách
                  </button>
                </div>
              </div>

              {/* Search Bar */}
              <div className="relative">
                <input
                  type="text"
                  placeholder="Tìm kiếm câu hỏi theo từ khóa hoặc số câu (ví dụ: 'đường ưu tiên', '72')..."
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setCurrentPage(1);
                    setCurrentQuestionIndex(0);
                  }}
                  className="w-full pl-11 pr-10 py-3.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl text-xs font-semibold shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all text-slate-800 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500"
                />
                <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </div>
                {searchQuery && (
                  <button
                    onClick={() => {
                      setSearchQuery('');
                      setCurrentPage(1);
                      setCurrentQuestionIndex(0);
                    }}
                    className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 flex items-center justify-center rounded-full bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-400 dark:text-slate-300 transition-colors"
                  >
                    <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                )}
              </div>

              {/* Questions Container */}
              <div className="flex flex-col gap-6">
                {filteredQuestions.length === 0 ? (
                  <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-12 text-center shadow-sm">
                    <div className="text-4xl mb-4">🔍</div>
                    <h3 className="font-bold text-lg mb-1 text-slate-700 dark:text-slate-200">Không tìm thấy câu hỏi phù hợp</h3>
                    <p className="text-sm text-slate-400 dark:text-slate-500">Hãy thay đổi từ khóa tìm kiếm hoặc bộ lọc.</p>
                  </div>
                ) : viewMode === 'single' ? (
                  // Single question view
                  <div>
                    <QuestionItem
                      question={filteredQuestions[currentQuestionIndex]}
                      userAnswerState={answers[filteredQuestions[currentQuestionIndex].id]}
                      onSelectOption={handleSelectOption}
                      onCheckAnswer={handleCheckAnswer}
                    />

                    {/* Navigation footer for single question mode */}
                    <div className="flex justify-between items-center mt-6 p-4 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl shadow-sm">
                      <button
                        onClick={() => setCurrentQuestionIndex(prev => Math.max(0, prev - 1))}
                        disabled={currentQuestionIndex === 0}
                        className="px-4 py-2.5 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-700 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-600 disabled:opacity-40 disabled:cursor-not-allowed font-bold text-xs"
                      >
                        &larr; Câu trước
                      </button>
                      <span className="text-xs font-bold text-slate-500 dark:text-slate-400">
                        Câu {currentQuestionIndex + 1} / {filteredQuestions.length}
                      </span>
                      <button
                        onClick={() => setCurrentQuestionIndex(prev => Math.min(filteredQuestions.length - 1, prev + 1))}
                        disabled={currentQuestionIndex === filteredQuestions.length - 1}
                        className="px-4 py-2.5 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-700 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-600 disabled:opacity-40 disabled:cursor-not-allowed font-bold text-xs"
                      >
                        Câu tiếp theo &rarr;
                      </button>
                    </div>
                  </div>
                ) : (
                  // Paginated List View
                  <div>
                    <div className="flex flex-col gap-6">
                      {filteredQuestions
                        .slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage)
                        .map(q => (
                          <QuestionItem
                            key={q.id}
                            question={q}
                            userAnswerState={answers[q.id]}
                            onSelectOption={handleSelectOption}
                            onCheckAnswer={handleCheckAnswer}
                          />
                        ))}
                    </div>
                    
                    {/* Pagination component */}
                    {filteredQuestions.length > itemsPerPage && 
                      renderPagination(Math.ceil(filteredQuestions.length / itemsPerPage))
                    }
                  </div>
                )}
              </div>
            </div>

            {/* RIGHT COLUMN: Sidebar Control Panel */}
            <aside className="lg:sticky lg:top-[92px] h-fit">
              <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-3xl p-6 shadow-sm flex flex-col gap-6">
                
                <div>
                  <h3 className="font-extrabold text-base mb-1">Bản đồ câu hỏi</h3>
                  <p className="text-xs text-slate-400 dark:text-slate-500">Ấn số câu hỏi để di chuyển nhanh</p>
                </div>

                {/* Progress Summary Stats in Sidebar */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-100 dark:border-emerald-900/50 p-3 rounded-xl text-center">
                    <span className="block text-2xl font-black text-emerald-600 dark:text-emerald-400">{stats.correct}</span>
                    <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500">Câu đúng</span>
                  </div>
                  <div className="bg-rose-50 dark:bg-rose-950/20 border border-rose-100 dark:border-rose-900/50 p-3 rounded-xl text-center">
                    <span className="block text-2xl font-black text-rose-600 dark:text-rose-400">{stats.incorrect}</span>
                    <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500">Câu sai</span>
                  </div>
                  <div className="col-span-2 bg-slate-50 dark:bg-slate-900/40 border border-slate-200/50 dark:border-slate-700/50 p-3 rounded-xl text-center">
                    <span className="block text-xl font-bold text-slate-600 dark:text-slate-300">{stats.skipped}</span>
                    <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500">Số câu chưa làm</span>
                  </div>
                </div>

                {/* 250 Questions Grid */}
                <div className="max-h-[300px] overflow-y-auto border border-slate-200 dark:border-slate-700 rounded-xl p-3 bg-slate-50 dark:bg-slate-900/40">
                  <div className="grid grid-cols-5 gap-2">
                    {questionBank.map(q => {
                      const ansState = answers[q.id];
                      let btnClasses = "w-full aspect-square font-black text-xs rounded-lg transition-all border flex items-center justify-center select-none ";
                      
                      const isFiltered = filteredQuestions.some(item => item.id === q.id);

                      if (ansState.isChecked) {
                        btnClasses += ansState.isCorrect 
                          ? "bg-emerald-500 border-emerald-500 text-white shadow-sm shadow-emerald-500/20 "
                          : "bg-rose-500 border-rose-500 text-white shadow-sm shadow-rose-500/20 ";
                      } else if (ansState.userAnswer !== null) {
                        btnClasses += "bg-indigo-50 border-indigo-200 dark:bg-indigo-950/40 dark:border-indigo-800 text-indigo-600 dark:text-indigo-400 ";
                      } else {
                        btnClasses += "bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 hover:border-slate-300 text-slate-500 dark:text-slate-400 ";
                      }

                      // Active border highlights for current view in single mode
                      if (viewMode === 'single') {
                        const activeQ = filteredQuestions[currentQuestionIndex];
                        if (activeQ && activeQ.id === q.id) {
                          btnClasses += "ring-2 ring-indigo-500 ring-offset-2 dark:ring-offset-slate-800 ";
                        }
                      }

                      return (
                        <button
                          key={q.id}
                          onClick={() => jumpToQuestion(q.id)}
                          className={btnClasses}
                          style={{ opacity: isFiltered ? 1 : 0.35 }}
                          title={`Câu ${q.id}`}
                        >
                          {q.id}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Sidebar Action buttons */}
                <div className="flex flex-col gap-2.5">
                  <button
                    onClick={handleSubmitQuiz}
                    className="w-full py-3.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl shadow-lg shadow-emerald-600/15 hover:shadow-emerald-600/25 flex items-center justify-center gap-1.5 transition-all"
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
                      <polyline points="22 4 12 14.01 9 11.01"></polyline>
                    </svg>
                    Nộp bài & Kết thúc
                  </button>
                  <button
                    onClick={handleResetQuiz}
                    className={`w-full py-3 border font-bold text-sm rounded-xl transition-all ${
                      resetConfirm 
                        ? 'border-rose-500 bg-rose-500 text-white hover:bg-rose-600 shadow-lg shadow-rose-500/15'
                        : 'border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700/50 text-slate-700 dark:text-slate-300'
                    }`}
                  >
                    {resetConfirm ? 'Xác nhận xóa hết và làm lại?' : 'Làm lại từ đầu'}
                  </button>
                </div>

              </div>
            </aside>
          </div>
        ) : (
          // ==================== TAB 2: EXAM MODE ====================
          <div>
            {!examActive && !examSubmitted ? (
              // 1. CONFIGURATION VIEW
              <div className="max-w-xl mx-auto my-8 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-3xl p-8 shadow-xl text-center flex flex-col gap-6 transition-all animate-[fadeIn_0.3s_ease-out]">
                <div>
                  <div className="w-16 h-16 bg-gradient-to-br from-indigo-500 to-indigo-700 text-white rounded-2xl flex items-center justify-center text-3xl mx-auto shadow-lg mb-4">
                    🚦
                  </div>
                  <h2 className="text-2xl font-black tracking-tight text-slate-800 dark:text-slate-100">
                    Thi Sát Hạch Lý Thuyết A1/A
                  </h2>
                  <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">
                    Đề thi trắc nghiệm ngẫu nhiên gồm 25 câu hỏi mô phỏng đề thi thật của Bộ GTVT.
                  </p>
                </div>

                {/* Class Selection */}
                <div className="flex flex-col gap-3 text-left">
                  <span className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider block">
                    Chọn hạng bằng lái xe:
                  </span>
                  <div className="grid grid-cols-2 gap-4">
                    <button
                      onClick={() => setExamLicenseClass('A1')}
                      className={`p-4 rounded-2xl border text-left flex flex-col justify-between transition-all duration-200 h-[130px] relative overflow-hidden ${
                        examLicenseClass === 'A1'
                          ? 'border-indigo-500 ring-2 ring-indigo-500/25 bg-indigo-50/10 dark:bg-indigo-950/20'
                          : 'border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600 bg-white dark:bg-slate-800'
                      }`}
                    >
                      <div>
                        <span className={`inline-block px-2.5 py-0.5 rounded-full font-black text-[10px] mb-2 transition-colors ${
                          examLicenseClass === 'A1'
                            ? 'bg-indigo-600 text-white'
                            : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300'
                        }`}>
                          Hạng A1
                        </span>
                        <h4 className="font-extrabold text-sm text-slate-800 dark:text-slate-100">Mô tô hạng A1</h4>
                        <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-1 leading-normal">
                          Dung tích xi lanh từ 50 cm³ đến dưới 175 cm³.
                        </p>
                      </div>
                      <div className="text-[11px] font-bold text-slate-500 dark:text-slate-400">
                        Đạt yêu cầu: <strong className="text-indigo-600 dark:text-indigo-400">21/25 câu</strong>
                      </div>
                    </button>

                    <button
                      onClick={() => setExamLicenseClass('A')}
                      className={`p-4 rounded-2xl border text-left flex flex-col justify-between transition-all duration-200 h-[130px] relative overflow-hidden ${
                        examLicenseClass === 'A'
                          ? 'border-indigo-500 ring-2 ring-indigo-500/25 bg-indigo-50/10 dark:bg-indigo-950/20'
                          : 'border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600 bg-white dark:bg-slate-800'
                      }`}
                    >
                      <div>
                        <span className={`inline-block px-2.5 py-0.5 rounded-full font-black text-[10px] mb-2 transition-colors ${
                          examLicenseClass === 'A'
                            ? 'bg-indigo-600 text-white'
                            : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300'
                        }`}>
                          Hạng A (A2)
                        </span>
                        <h4 className="font-extrabold text-sm text-slate-800 dark:text-slate-100">Mô tô hạng A</h4>
                        <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-1 leading-normal">
                          Dung tích xi lanh từ 175 cm³ trở lên.
                        </p>
                      </div>
                      <div className="text-[11px] font-bold text-slate-500 dark:text-slate-400">
                        Đạt yêu cầu: <strong className="text-indigo-600 dark:text-indigo-400">23/25 câu</strong>
                      </div>
                    </button>
                  </div>
                </div>

                {/* Rules List */}
                <div className="bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700/50 rounded-2xl p-4 text-left text-xs leading-relaxed flex flex-col gap-2.5">
                  <span className="font-extrabold text-slate-700 dark:text-slate-300 block text-xs">
                    ⚠️ QUY ĐỊNH BÀI THI HẠNG {examLicenseClass}:
                  </span>
                  <div className="flex gap-2">
                    <span className="shrink-0 text-sm">⏱️</span>
                    <div>
                      <strong>Thời gian:</strong> Thí sinh có <strong>19 phút</strong> làm bài. Hết giờ hệ thống tự động nộp.
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <span className="shrink-0 text-sm">📋</span>
                    <div>
                      <strong>Cơ cấu đề:</strong> 25 câu hỏi ngẫu nhiên. Mỗi câu 1 điểm, chỉ có 1 phương án trả lời đúng.
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <span className="shrink-0 text-sm">🔴</span>
                    <div>
                      <strong>Câu hỏi điểm liệt:</strong> Đề thi chứa <strong>3 câu điểm liệt</strong>. Nếu trả lời <strong>sai hoặc bỏ trống</strong> bất kỳ câu điểm liệt nào, thí sinh sẽ bị <strong>ĐÁNH TRƯỢT NGAY LẬP TỨC</strong>, bất kể tổng số điểm đạt bao nhiêu.
                    </div>
                  </div>
                </div>

                <button
                  onClick={() => handleStartExam(examLicenseClass)}
                  className="w-full py-4 bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-sm rounded-2xl shadow-lg shadow-indigo-600/20 hover:shadow-indigo-600/30 transition-all duration-150 flex items-center justify-center gap-2 group"
                >
                  Bắt đầu làm bài thi
                  <svg className="w-4 h-4 transform group-hover:translate-x-0.5 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M14 5l7 7m0 0l-7 7m7-7H3" />
                  </svg>
                </button>
              </div>
            ) : examSubmitted && !examReviewMode ? (
              // 2. EXAM RESULTS SUMMARY VIEW
              <div className="max-w-2xl mx-auto my-8 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-3xl p-8 shadow-xl text-center flex flex-col gap-6 relative overflow-hidden transition-all animate-[fadeIn_0.3s_ease-out]">
                {/* Canvas Confetti */}
                {examStats?.isPassed && (
                  <canvas ref={examCanvasRef} className="absolute inset-0 pointer-events-none w-full h-full z-10" />
                )}

                <div className="relative z-20">
                  <div className={`w-20 h-20 rounded-full flex items-center justify-center mx-auto text-4xl mb-4 ${
                    examStats?.isPassed 
                      ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 border-4 border-emerald-100 dark:border-emerald-900/40' 
                      : 'bg-rose-50 dark:bg-rose-950/40 text-rose-600 border-4 border-rose-100 dark:border-rose-900/40'
                  }`}>
                    {examStats?.isPassed ? '🏆' : '❌'}
                  </div>

                  <h2 className={`text-3xl font-black tracking-tight ${
                    examStats?.isPassed ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'
                  }`}>
                    {examStats?.isPassed ? 'ĐẠT YÊU CẦU' : 'CHƯA ĐẠT'}
                  </h2>
                  
                  <p className="text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-widest mt-1">
                    KẾT QUẢ SÁT HẠCH HẠNG {examLicenseClass}
                  </p>
                </div>

                {/* Score and stats visualization */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 relative z-20">
                  <div className="bg-slate-50 dark:bg-slate-900/40 border border-slate-200/60 dark:border-slate-700/50 p-4 rounded-2xl">
                    <span className="block text-2xl font-black text-slate-700 dark:text-slate-200">{examStats?.correct}/25</span>
                    <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase">Điểm số</span>
                  </div>
                  <div className="bg-slate-50 dark:bg-slate-900/40 border border-slate-200/60 dark:border-slate-700/50 p-4 rounded-2xl">
                    <span className="block text-2xl font-black text-slate-700 dark:text-slate-200">{formatTime(examStats?.timeUsed)}</span>
                    <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase">Thời gian thi</span>
                  </div>
                  <div className={`p-4 rounded-2xl border ${
                    examStats?.hasCrucialError
                      ? 'bg-rose-50/50 dark:bg-rose-950/20 border-rose-200 dark:border-rose-900/50'
                      : 'bg-emerald-50/50 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-900/50'
                  }`}>
                    <span className={`block text-lg font-extrabold ${examStats?.hasCrucialError ? 'text-rose-600' : 'text-emerald-600'}`}>
                      {examStats?.hasCrucialError ? '❌ Bị Sai' : '✅ Không Sai'}
                    </span>
                    <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase">Câu điểm liệt</span>
                  </div>
                  <div className="bg-slate-50 dark:bg-slate-900/40 border border-slate-200/60 dark:border-slate-700/50 p-4 rounded-2xl">
                    <span className="block text-2xl font-black text-slate-700 dark:text-slate-200">{examStats?.scorePercentage}%</span>
                    <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase">Tỷ lệ đúng</span>
                  </div>
                </div>

                {/* Specific Failure message */}
                {!examStats?.isPassed && (
                  <div className="bg-rose-50 dark:bg-rose-950/25 border border-rose-200 dark:border-rose-900/40 rounded-2xl p-4 text-sm text-rose-800 dark:text-rose-300 text-left flex items-start gap-2.5 relative z-20">
                    <span className="text-xl shrink-0 mt-0.5">⚠️</span>
                    <div>
                      {examStats?.correct < examStats?.passingScore ? (
                        <p>
                          <strong>Bạn chưa đạt đủ số điểm:</strong> Chỉ trả lời đúng <strong>{examStats?.correct}</strong> trên tổng số 25 câu hỏi (Hạng {examLicenseClass} yêu cầu đúng tối thiểu <strong>{examStats?.passingScore} câu</strong> trở lên).
                        </p>
                      ) : examStats?.hasCrucialError ? (
                        <p>
                          <strong>Trượt do sai câu điểm liệt:</strong> Mặc dù bạn đạt đủ điểm số yêu cầu (<strong>{examStats?.correct}/25 câu</strong>), bạn đã trả lời sai hoặc bỏ qua câu hỏi điểm liệt. Theo quy định, kết quả bài thi bị đánh trượt ngay lập tức.
                        </p>
                      ) : null}
                    </div>
                  </div>
                )}

                {/* Action buttons */}
                <div className="flex flex-col sm:flex-row gap-3 relative z-20">
                  <button
                    onClick={() => setExamReviewMode(true)}
                    className="flex-1 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm rounded-xl shadow-lg shadow-indigo-600/10 flex items-center justify-center gap-1.5"
                  >
                    🔍 Xem lại bài làm
                  </button>
                  <button
                    onClick={handleForceResetExam}
                    className="flex-1 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm rounded-xl shadow-lg shadow-emerald-600/10 flex items-center justify-center gap-1.5"
                  >
                    🔄 Thi đề khác
                  </button>
                  <button
                    onClick={() => {
                      setExamActive(false);
                      setExamSubmitted(false);
                      setExamReviewMode(false);
                      setExamQuestions([]);
                    }}
                    className="px-6 py-3 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 font-bold text-sm rounded-xl"
                  >
                    Thoát
                  </button>
                </div>
              </div>
            ) : (
              // 3. ACTIVE EXAM VIEW / REVIEW MODE VIEW
              <div className="grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-6 transition-all animate-[fadeIn_0.3s_ease-out]">
                
                {/* Left Column: Question Item and Timer Panel */}
                <div className="flex flex-col gap-6">
                  {/* Sticky Timer and Mode Bar */}
                  <div className="sticky top-[80px] z-30 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-4 shadow-sm flex flex-col sm:flex-row justify-between items-center gap-4 transition-colors">
                    <div className="flex items-center gap-2">
                      <span className="px-3 py-1 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 font-black text-xs rounded-full uppercase tracking-wider">
                        {examReviewMode ? 'Xem lại bài' : 'Đang thi'}
                      </span>
                      <h3 className="font-extrabold text-sm text-slate-800 dark:text-slate-200">
                        Hạng {examLicenseClass} (Câu {examCurrentIndex + 1}/25)
                      </h3>
                    </div>

                    {/* Timer or Status */}
                    {examReviewMode ? (
                      <div className={`px-4 py-1.5 rounded-xl font-bold text-xs border ${
                        examStats?.isPassed 
                          ? 'bg-emerald-50 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-900/50 text-emerald-600' 
                          : 'bg-rose-50 dark:bg-rose-950/20 border-rose-200 dark:border-rose-900/50 text-rose-600'
                      }`}>
                        {examStats?.isPassed ? 'ĐẠT' : 'CHƯA ĐẠT'} ({examStats?.correct}/25)
                      </div>
                    ) : (
                      <div className={`px-4 py-2 rounded-xl font-mono text-base font-extrabold flex items-center gap-1.5 transition-all duration-300 ${
                        examTimeRemaining < 120 
                          ? 'bg-rose-500 text-white animate-pulse shadow-md shadow-rose-500/20' 
                          : 'bg-slate-100 dark:bg-slate-700 text-indigo-600 dark:text-indigo-400'
                      }`}>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                          <circle cx="12" cy="12" r="10"></circle>
                          <polyline points="12 6 12 12 16 14"></polyline>
                        </svg>
                        {formatTime(examTimeRemaining)}
                      </div>
                    )}

                    {/* Progress Bar in Exam */}
                    <div className="flex items-center gap-2 w-full sm:w-[150px]">
                      <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 whitespace-nowrap">
                        Tiến độ:
                      </span>
                      <div className="flex-1 h-2 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-indigo-600 transition-all duration-300"
                          style={{ 
                            width: `${(Object.values(examAnswers).filter(a => a.userAnswer !== null).length / 25) * 100}%` 
                          }}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Question Render */}
                  <div>
                    {examQuestions[examCurrentIndex] && (
                      <QuestionItem
                        question={examQuestions[examCurrentIndex]}
                        userAnswerState={examAnswers[examQuestions[examCurrentIndex].id]}
                        onSelectOption={handleSelectExamOption}
                        isExamMode={true}
                        isExamSubmitted={examSubmitted}
                      />
                    )}

                    {/* Navigation bar for Single Question Mode in Exam */}
                    <div className="flex justify-between items-center mt-6 p-4 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl shadow-sm">
                      <button
                        onClick={() => setExamCurrentIndex(prev => Math.max(0, prev - 1))}
                        disabled={examCurrentIndex === 0}
                        className="px-4 py-2.5 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-700 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-600 disabled:opacity-40 disabled:cursor-not-allowed font-bold text-xs"
                      >
                        &larr; Câu trước
                      </button>
                      <span className="text-xs font-bold text-slate-500 dark:text-slate-400">
                        Câu {examCurrentIndex + 1} / 25
                      </span>
                      <button
                        onClick={() => setExamCurrentIndex(prev => Math.min(24, prev + 1))}
                        disabled={examCurrentIndex === 24}
                        className="px-4 py-2.5 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-700 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-600 disabled:opacity-40 disabled:cursor-not-allowed font-bold text-xs"
                      >
                        Câu tiếp theo &rarr;
                      </button>
                    </div>
                  </div>
                </div>

                {/* Right Column: Question Grid and Submission panel */}
                <aside className="lg:sticky lg:top-[92px] h-fit">
                  <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-3xl p-6 shadow-sm flex flex-col gap-6">
                    <div>
                      <h3 className="font-extrabold text-base mb-1">Bản đồ bài thi</h3>
                      <p className="text-xs text-slate-400 dark:text-slate-500">
                        {examReviewMode ? 'Màu xanh: Đúng, Đỏ: Sai, Xám: Bỏ qua' : 'Ấn ô số để di chuyển nhanh'}
                      </p>
                    </div>

                    {/* Grid map for 25 exam questions */}
                    <div className="border border-slate-200 dark:border-slate-700 rounded-xl p-3 bg-slate-50 dark:bg-slate-900/40">
                      <div className="grid grid-cols-5 gap-2">
                        {examQuestions.map((q, idx) => {
                          const state = examAnswers[q.id];
                          let cellClass = "w-full aspect-square font-black text-xs rounded-lg transition-all border flex items-center justify-center select-none ";

                          if (examSubmitted) {
                            // Review mode styling
                            if (state?.userAnswer === null) {
                              cellClass += "bg-slate-100 dark:bg-slate-800 border-slate-300 dark:border-slate-700 text-slate-400 ";
                            } else if (state?.userAnswer === q.correctAnswer) {
                              cellClass += "bg-emerald-500 border-emerald-500 text-white shadow-sm shadow-emerald-500/10 ";
                            } else {
                              cellClass += "bg-rose-500 border-rose-500 text-white shadow-sm shadow-rose-500/10 ";
                            }
                          } else {
                            // Exam in-progress styling
                            if (state?.userAnswer !== null) {
                              cellClass += "bg-indigo-500 border-indigo-500 text-white shadow-sm shadow-indigo-500/10 ";
                            } else {
                              cellClass += "bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 hover:border-slate-300 ";
                            }
                          }

                          // Active ring
                          if (examCurrentIndex === idx) {
                            cellClass += "ring-2 ring-indigo-500 ring-offset-2 dark:ring-offset-slate-800 ";
                          }

                          return (
                            <button
                              key={q.id}
                              onClick={() => setExamCurrentIndex(idx)}
                              className={cellClass}
                              title={`Câu ${q.id}`}
                            >
                              {idx + 1}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* Action buttons inside exam sidebar */}
                    <div className="flex flex-col gap-2.5">
                      {examReviewMode ? (
                        <button
                          onClick={() => setExamReviewMode(false)}
                          className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm rounded-xl shadow-md flex items-center justify-center gap-1.5 transition-all"
                        >
                          ⬅️ Quay lại bảng điểm
                        </button>
                      ) : (
                        <>
                          <button
                            onClick={handleSelectSubmitExam}
                            className={`w-full py-3.5 text-white font-bold rounded-xl shadow-lg transition-all flex items-center justify-center gap-1.5 ${
                              submitConfirm
                                ? 'bg-rose-600 hover:bg-rose-700 shadow-rose-600/15'
                                : 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-600/15'
                            }`}
                          >
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                              <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
                              <polyline points="22 4 12 14.01 9 11.01"></polyline>
                            </svg>
                            {submitConfirm ? 'Xác nhận nộp bài?' : 'Nộp bài thi'}
                          </button>
                          
                          <button
                            onClick={handleCancelExam}
                            className="w-full py-3 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700/50 text-slate-700 dark:text-slate-300 font-bold text-sm rounded-xl transition-all"
                          >
                            Hủy bài thi
                          </button>
                        </>
                      )}
                    </div>

                  </div>
                </aside>

              </div>
            )}
          </div>
        )}
      </main>

      {/* FOOTER */}
      <footer className="bg-white dark:bg-slate-800 border-t border-slate-200 dark:border-slate-700 py-6 text-center text-xs text-slate-400 dark:text-slate-500 transition-colors">
        <p>© 2026 Hệ thống thi trắc nghiệm lý thuyết lái xe A1/A2. Được xây dựng bằng React & Tailwind CSS.</p>
      </footer>

      {/* RESULTS MODAL POPUP */}
      <ResultsModal
        isOpen={isResultsOpen}
        onClose={() => setIsResultsOpen(false)}
        onReset={handleForceReset}
        stats={stats}
      />

      {/* TOAST SYSTEM */}
      {toast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 border border-slate-800 dark:border-slate-200 px-5 py-3 rounded-full shadow-2xl flex items-center gap-2 font-semibold text-sm animate-[slideUp_0.2s_ease-out]">
          <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          {toast}
        </div>
      )}
    </div>
  );
}
