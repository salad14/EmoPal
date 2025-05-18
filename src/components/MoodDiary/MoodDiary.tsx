import React, { useState, useEffect, useCallback, useRef } from 'react';
// 改用动态导入
// @ts-ignore
const Calendar = React.lazy(() => import('react-calendar'));
import 'react-calendar/dist/Calendar.css'; // 默认 react-calendar 样式
import './MoodDiary.css'; // 你的自定义样式
// @ts-ignore - 忽略date-fns模块的类型检查问题
import { format, parseISO, startOfDay, isAfter, isSameMonth, isToday } from 'date-fns';
// @ts-ignore - 忽略date-fns/locale模块的类型检查问题
import { zhCN } from 'date-fns/locale'; // 引入中文语言包

// 心情类型定义
type MoodType = 'happy' | 'sad' | 'neutral' | 'anxious' | 'angry' | 'loved' | 'excited' | '';
interface MoodEntry {
  mood: MoodType;
  notes: string;
}
interface MoodData {
  [date: string]: MoodEntry; // 日期格式: YYYY-MM-DD
}

interface WeatherData {
  description: string;
  temp?: number;
  icon?: string;
  city?: string;
}

const MOOD_STORAGE_KEY = 'heartfeltPartner_moodDiaryData_v1'; // 更具体的键名

// 可选的心情及其中文标签
const MOOD_OPTIONS: { mood: MoodType; emoji: string; label: string }[] = [
  { mood: 'happy', emoji: '😊', label: '开心' },
  { mood: 'sad', emoji: '😢', label: '伤心' },
  { mood: 'neutral', emoji: '😐', label: '平静' },
  { mood: 'anxious', emoji: '😟', label: '焦虑' },
  { mood: 'angry', emoji: '😠', label: '生气' },
  { mood: 'loved', emoji: '🥰', label: '喜爱' },
  { mood: 'excited', emoji: '🎉', label: '兴奋' },
];

const MoodDiary: React.FC = () => {
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [moods, setMoods] = useState<MoodData>({});
  const [currentMood, setCurrentMood] = useState<MoodType>('');
  const [currentNotes, setCurrentNotes] = useState<string>('');
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [weatherError, setWeatherError] = useState<string | null>(null);
  const [isLoadingWeather, setIsLoadingWeather] = useState<boolean>(true);

  const isMountedRef = useRef(true); // 用于处理异步操作中的组件卸载情况

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  // 从 localStorage 加载心情数据
  useEffect(() => {
    const storedMoods = localStorage.getItem(MOOD_STORAGE_KEY);
    if (storedMoods) {
      try {
        setMoods(JSON.parse(storedMoods));
      } catch (error) {
        console.error("解析已存储的心情数据时出错:", error);
        // 可以选择删除损坏的数据 localStorage.removeItem(MOOD_STORAGE_KEY);
        setMoods({});
      }
    }
  }, []);

  // 获取天气信息
  useEffect(() => {
    const fetchWeather = async (latitude: number, longitude: number) => {
      setIsLoadingWeather(true);
      setWeatherError(null);
      try {
        const response = await fetch(`/api/get-weather?lat=${latitude}&lon=${longitude}`);
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || `天气服务错误: ${response.status}`);
        }
        const data: WeatherData = await response.json();
        if (isMountedRef.current) {
          setWeather(data);
        }
      } catch (error: any) {
        console.error("获取天气失败:", error);
        if (isMountedRef.current) {
          setWeatherError(error.message || '无法加载天气信息');
        }
      } finally {
        if (isMountedRef.current) {
          setIsLoadingWeather(false);
        }
      }
    };

    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          fetchWeather(position.coords.latitude, position.coords.longitude);
        },
        (error) => {
          console.error("获取地理位置失败:", error);
          if (isMountedRef.current) {
            setWeatherError('无法获取地理位置以查询天气');
            setIsLoadingWeather(false);
          }
          // 可以尝试根据IP获取大致位置的天气作为备选，但这通常需要后端支持或付费服务
        }
      );
    } else {
      if (isMountedRef.current) {
        setWeatherError('浏览器不支持地理位置服务');
        setIsLoadingWeather(false);
      }
    }
  }, []); // 仅在组件挂载时获取一次

  // 当选择的日期或心情数据变化时，更新输入框内容
  useEffect(() => {
    const dateKey = format(selectedDate, 'yyyy-MM-dd');
    const entry = moods[dateKey];
    if (entry) {
      setCurrentMood(entry.mood);
      setCurrentNotes(entry.notes);
    } else {
      setCurrentMood('');
      setCurrentNotes('');
    }
  }, [selectedDate, moods]);

  const handleDateChange = (date: Date | Date[] | null) => {
    // react-calendar 返回的可能是 Date, Date[] 或 null
    if (date && !Array.isArray(date)) {
      setSelectedDate(startOfDay(date)); // 确保是当天的开始，避免时区问题
    }
  };

  const handleMoodSelect = (mood: MoodType) => {
    setCurrentMood(mood);
  };

  const handleNotesChange = (event: React.ChangeEvent<HTMLTextAreaElement>) => {
    setCurrentNotes(event.target.value);
  };

  const saveMood = () => {
    // 心情是可选的，但如果选了，笔记可以为空
    // if (!currentMood) {
    //   alert('请选择一个心情！');
    //   return;
    // }
    const dateKey = format(selectedDate, 'yyyy-MM-dd');
    const newMoods = {
      ...moods,
      [dateKey]: { mood: currentMood, notes: currentNotes },
    };
    setMoods(newMoods);
    try {
      localStorage.setItem(MOOD_STORAGE_KEY, JSON.stringify(newMoods));
      // 可以给一个更友好的保存成功提示，比如一个短暂的toast
      console.log('心情已保存！');
    } catch (error) {
      console.error("保存心情到localStorage失败:", error);
      alert('保存心情失败，可能是本地存储已满。');
    }
  };

  // 自定义日历格子内容，用于显示心情Emoji
  const tileContent = useCallback(({ date, view }: { date: Date; view: string }) => {
    if (view === 'month') { // 只在月视图中显示
      const dateKey = format(date, 'yyyy-MM-dd');
      const entry = moods[dateKey];
      if (entry && entry.mood) {
        const moodOption = MOOD_OPTIONS.find(opt => opt.mood === entry.mood);
        return <span className="mood-indicator" title={moodOption?.label}>{moodOption?.emoji}</span>;
      }
    }
    return null;
  }, [moods]);

  // 禁用未来日期
  const tileDisabled = useCallback(({ date, view }: { date: Date; view: string }) => {
    // 只在月视图中起作用
    if (view === 'month') {
      const today = new Date();
      // 如果日期在今天之后，则禁用
      return isAfter(date, today);
    }
    return false;
  }, []);

  // 为日期格子添加样式类
  const tileClassName = useCallback(({ date, view }: { date: Date; view: string }) => {
    if (view !== 'month') return null;

    const today = new Date();
    const classes = [];

    // 为有心情记录的日期添加相应的心情类
    const dateKey = format(date, 'yyyy-MM-dd');
    const entry = moods[dateKey];
    if (entry && entry.mood) {
      classes.push(`mood-${entry.mood}`);
    }

    // 为未来日期添加特殊类名
    if (isAfter(date, today)) {
      classes.push('react-calendar__tile--future');
    }

    return classes.join(' ');
  }, [moods]);

  // 格式化日期显示，使用中文
  const formatDateForDisplay = (date: Date) => {
    return format(date, 'yyyy年MM月dd日 EEEE', { locale: zhCN });
  };

  // 判断是否可以记录选择的日期
  const canRecordSelectedDate = useCallback(() => {
    const today = new Date();
    return !isAfter(selectedDate, today);
  }, [selectedDate]);

  return (
    <div className="mood-diary-container">
      <div className="current-info">
        <h3>心情日记</h3>
        <p>{formatDateForDisplay(new Date())}</p>
        <div className="weather-info">
          {isLoadingWeather && <span>天气信息加载中...</span>}
          {weatherError && <span style={{ color: 'red' }}>{weatherError}</span>}
          {weather && !isLoadingWeather && !weatherError && (
            <>
              {weather.icon && <img src={`https://openweathermap.org/img/wn/${weather.icon}.png`} alt={weather.description} />}
              <span>{weather.city} {weather.description}, {weather.temp}°C</span>
            </>
          )}
        </div>
      </div>

      <React.Suspense fallback={<div>日历加载中...</div>}>
        <Calendar
          className="mood-calendar"
          onChange={handleDateChange as any} // react-calendar 的类型定义有时需要 as any
          value={selectedDate}
          tileContent={tileContent}
          tileClassName={tileClassName}
          tileDisabled={tileDisabled}
          locale="zh-CN" // 使用中文，需要浏览器支持或polyfil
          formatShortWeekday={(locale: any, date: Date) => format(date, 'EEEEE', { locale: zhCN })} // 单个汉字星期，如：一
          // navigationLabel={({ date, label, locale, view }) => `当前是${format(date, 'yyyy年MM月', {locale: zhCN})}`}
        />
      </React.Suspense>

      <div className="mood-input-section">
        <h4>记录 {format(selectedDate, 'MM月dd日', { locale: zhCN })} 的心情：</h4>
        {canRecordSelectedDate() ? (
          <>
            <div className="mood-options">
              {MOOD_OPTIONS.map(option => (
                <button
                  key={option.mood}
                  title={option.label}
                  className={currentMood === option.mood ? 'selected' : ''}
                  onClick={() => handleMoodSelect(option.mood)}
                  aria-label={option.label}
                >
                  {option.emoji}
                </button>
              ))}
            </div>
            <textarea
              className="mood-notes"
              placeholder="有什么想说的吗？（可选）"
              value={currentNotes}
              onChange={handleNotesChange}
              rows={3}
            />
            <button 
              className="save-mood-button" 
              onClick={saveMood}
              disabled={!currentMood && !currentNotes.trim()} // 如果既没选心情也没写笔记，则禁用
            >
              保存心情
            </button>
          </>
        ) : (
          <div className="future-date-warning">
            <p>不能记录未来日期的心情。请选择今天或过去的日期。</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default MoodDiary; 