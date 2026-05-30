import { useState, useEffect } from 'react';
import { 
  ChevronLeft, 
  ChevronRight, 
  CheckCircle, 
  BookOpen,
  MessageCircle,
  Lightbulb,
  PenLine
} from 'lucide-react';

const PARAGRAPHS_PER_SECTION = 3;

const SectionedLearningContent = ({ 
  stepData, 
  onSectionComplete,
  saveAnswer,
  getAnswer
}) => {
  const [currentSection, setCurrentSection] = useState(0);
  const [sectionAnswers, setSectionAnswers] = useState({});
  const [completedSections, setCompletedSections] = useState([]);

  const rawContent = stepData?.content || [];
  const contentArray = Array.isArray(rawContent) ? rawContent : (typeof rawContent === 'string' ? [rawContent] : []);
  const reflectionPrompts = stepData?.reflectionPrompts || [];
  const bullets = stepData?.bullets || [];
  const keyTakeaways = stepData?.keyTakeaways || [];

  const totalContentSections = Math.ceil(contentArray.length / PARAGRAPHS_PER_SECTION);
  const hasReflectionSection = reflectionPrompts.length > 0;
  const hasBulletsSection = bullets.length > 0;
  const hasTakeawaysSection = keyTakeaways.length > 0;
  
  const sections = [];
  
  for (let i = 0; i < totalContentSections; i++) {
    const start = i * PARAGRAPHS_PER_SECTION;
    const end = start + PARAGRAPHS_PER_SECTION;
    const sectionParagraphs = contentArray.slice(start, end);
    
    const reflectionQuestion = reflectionPrompts[i] || null;
    
    sections.push({
      type: 'content',
      paragraphs: sectionParagraphs,
      reflectionQuestion,
      sectionNumber: i + 1
    });
  }

  if (hasBulletsSection) {
    sections.push({
      type: 'bullets',
      bullets,
      sectionNumber: sections.length + 1
    });
  }

  if (hasTakeawaysSection) {
    sections.push({
      type: 'takeaways',
      takeaways: keyTakeaways,
      sectionNumber: sections.length + 1
    });
  }

  if (hasReflectionSection && reflectionPrompts.length > totalContentSections) {
    const remainingPrompts = reflectionPrompts.slice(totalContentSections);
    sections.push({
      type: 'reflection',
      prompts: remainingPrompts,
      sectionNumber: sections.length + 1
    });
  }

  const totalSections = sections.length;
  const currentSectionData = sections[currentSection];
  const isLastSection = currentSection === totalSections - 1;
  const isFirstSection = currentSection === 0;

  useEffect(() => {
    const loadAnswers = async () => {
      if (getAnswer) {
        try {
          const saved = await getAnswer();
          if (saved && saved.sectionAnswers) {
            setSectionAnswers(saved.sectionAnswers);
            setCompletedSections(saved.completedSections || []);
          }
        } catch (e) {
          console.warn('Could not load section answers:', e);
        }
      }
    };
    loadAnswers();
  }, [getAnswer]);

  const handleAnswerChange = (questionKey, value) => {
    const newAnswers = {
      ...sectionAnswers,
      [questionKey]: value
    };
    setSectionAnswers(newAnswers);
    
    if (saveAnswer) {
      saveAnswer({
        sectionAnswers: newAnswers,
        completedSections
      });
    }
  };

  const handleNextSection = () => {
    if (!completedSections.includes(currentSection)) {
      const newCompleted = [...completedSections, currentSection];
      setCompletedSections(newCompleted);
      
      if (saveAnswer) {
        saveAnswer({
          sectionAnswers,
          completedSections: newCompleted
        });
      }
    }
    
    if (isLastSection) {
      if (onSectionComplete) {
        onSectionComplete();
      }
    } else {
      setCurrentSection(currentSection + 1);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handlePrevSection = () => {
    if (!isFirstSection) {
      setCurrentSection(currentSection - 1);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const renderContentSection = (section) => (
    <div className="space-y-6">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-10 h-10 bg-amber-100 rounded-xl flex items-center justify-center">
          <BookOpen className="w-5 h-5 text-amber-600" />
        </div>
        <div>
          <h3 className="text-xl font-bold text-gray-900">{stepData.title}</h3>
          <p className="text-sm text-gray-500">Section {section.sectionNumber} of {totalSections}</p>
        </div>
      </div>

      <div className="space-y-4">
        {section.paragraphs.map((paragraph, index) => (
          <p key={index} className="text-gray-700 leading-relaxed text-lg">
            {paragraph}
          </p>
        ))}
      </div>

      {section.reflectionQuestion && (
        <div className="mt-8 bg-gradient-to-r from-amber-50 to-yellow-50 rounded-2xl p-6 border border-amber-200">
          <div className="flex items-start gap-3 mb-4">
            <div className="w-10 h-10 bg-amber-100 rounded-xl flex items-center justify-center flex-shrink-0">
              <MessageCircle className="w-5 h-5 text-amber-600" />
            </div>
            <div>
              <h4 className="font-bold text-amber-900">Pause & Reflect</h4>
              <p className="text-sm text-amber-700">Take a moment to consider this question before continuing</p>
            </div>
          </div>
          <p className="text-amber-900 font-medium mb-4">{section.reflectionQuestion}</p>
          <textarea
            className="w-full p-4 border border-amber-200 rounded-xl focus:ring-2 focus:ring-amber-400 focus:border-amber-400 resize-none bg-white"
            rows={4}
            placeholder="Write your thoughts here..."
            value={sectionAnswers[`reflection-${section.sectionNumber}`] || ''}
            onChange={(e) => handleAnswerChange(`reflection-${section.sectionNumber}`, e.target.value)}
          />
        </div>
      )}
    </div>
  );

  const renderBulletsSection = (section) => (
    <div className="space-y-6">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-10 h-10 bg-amber-100 rounded-xl flex items-center justify-center">
          <Lightbulb className="w-5 h-5 text-amber-600" />
        </div>
        <div>
          <h3 className="text-xl font-bold text-gray-900">Key Points</h3>
          <p className="text-sm text-gray-500">Important concepts to remember</p>
        </div>
      </div>

      <div className="bg-amber-50 rounded-2xl p-6 border border-amber-100">
        <ul className="space-y-4">
          {section.bullets.map((bullet, index) => (
            <li key={index} className="flex items-start gap-3">
              <div className="w-6 h-6 bg-amber-200 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                <span className="text-amber-700 text-sm font-bold">{index + 1}</span>
              </div>
              <span className="text-amber-900 leading-relaxed">{bullet}</span>
            </li>
          ))}
        </ul>
      </div>

      <div className="bg-gray-50 rounded-2xl p-6 border border-gray-200">
        <div className="flex items-start gap-3 mb-4">
          <PenLine className="w-5 h-5 text-gray-600" />
          <h4 className="font-semibold text-gray-900">Which point resonates most with you?</h4>
        </div>
        <textarea
          className="w-full p-4 border border-gray-200 rounded-xl focus:ring-2 focus:ring-amber-400 focus:border-amber-400 resize-none"
          rows={3}
          placeholder="Share which key point stands out to you and why..."
          value={sectionAnswers[`bullets-reflection`] || ''}
          onChange={(e) => handleAnswerChange(`bullets-reflection`, e.target.value)}
        />
      </div>
    </div>
  );

  const renderTakeawaysSection = (section) => (
    <div className="space-y-6">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center">
          <CheckCircle className="w-5 h-5 text-blue-600" />
        </div>
        <div>
          <h3 className="text-xl font-bold text-gray-900">Key Takeaways</h3>
          <p className="text-sm text-gray-500">What to carry forward from this section</p>
        </div>
      </div>

      <div className="bg-blue-50 rounded-2xl p-6 border border-blue-100">
        <ul className="space-y-4">
          {section.takeaways.map((takeaway, index) => (
            <li key={index} className="flex items-start gap-3">
              <CheckCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
              <span className="text-blue-900 leading-relaxed">{takeaway}</span>
            </li>
          ))}
        </ul>
      </div>

      <div className="bg-gradient-to-r from-blue-50 to-stone-50 rounded-2xl p-6 border border-blue-200">
        <h4 className="font-semibold text-blue-900 mb-3">How will you apply this?</h4>
        <p className="text-blue-700 text-sm mb-4">Think about one specific way you can apply these takeaways in your daily life</p>
        <textarea
          className="w-full p-4 border border-blue-200 rounded-xl focus:ring-2 focus:ring-blue-400 focus:border-blue-400 resize-none bg-white"
          rows={3}
          placeholder="Describe how you'll apply these insights..."
          value={sectionAnswers[`takeaways-application`] || ''}
          onChange={(e) => handleAnswerChange(`takeaways-application`, e.target.value)}
        />
      </div>
    </div>
  );

  const renderReflectionSection = (section) => (
    <div className="space-y-6">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-10 h-10 bg-yellow-100 rounded-xl flex items-center justify-center">
          <MessageCircle className="w-5 h-5 text-yellow-600" />
        </div>
        <div>
          <h3 className="text-xl font-bold text-gray-900">Deeper Reflection</h3>
          <p className="text-sm text-gray-500">Additional questions for your journey</p>
        </div>
      </div>

      <div className="space-y-6">
        {section.prompts.map((prompt, index) => (
          <div key={index} className="bg-yellow-50 rounded-2xl p-6 border border-yellow-200">
            <p className="text-yellow-900 font-medium mb-4">{prompt}</p>
            <textarea
              className="w-full p-4 border border-yellow-200 rounded-xl focus:ring-2 focus:ring-yellow-400 focus:border-yellow-400 resize-none bg-white"
              rows={4}
              placeholder="Write your thoughts here..."
              value={sectionAnswers[`deep-reflection-${index}`] || ''}
              onChange={(e) => handleAnswerChange(`deep-reflection-${index}`, e.target.value)}
            />
          </div>
        ))}
      </div>
    </div>
  );

  const renderCurrentSection = () => {
    if (!currentSectionData) return null;

    switch (currentSectionData.type) {
      case 'content':
        return renderContentSection(currentSectionData);
      case 'bullets':
        return renderBulletsSection(currentSectionData);
      case 'takeaways':
        return renderTakeawaysSection(currentSectionData);
      case 'reflection':
        return renderReflectionSection(currentSectionData);
      default:
        return null;
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          {sections.map((_, index) => (
            <button
              key={index}
              onClick={() => setCurrentSection(index)}
              className={`w-3 h-3 rounded-full transition-all ${
                index === currentSection 
                  ? 'bg-amber-600 w-8' 
                  : completedSections.includes(index)
                    ? 'bg-green-500'
                    : 'bg-gray-300 hover:bg-gray-400'
              }`}
            />
          ))}
        </div>
        <span className="text-sm text-gray-500">
          {currentSection + 1} / {totalSections}
        </span>
      </div>

      {renderCurrentSection()}

      <div className="flex justify-between items-center pt-6 border-t border-gray-200">
        <button
          onClick={handlePrevSection}
          disabled={isFirstSection}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors ${
            isFirstSection
              ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
              : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
          }`}
        >
          <ChevronLeft className="w-4 h-4" />
          Previous Section
        </button>

        <button
          onClick={handleNextSection}
          className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-amber-600 to-emerald-600 text-white rounded-lg font-semibold hover:from-amber-700 hover:to-emerald-700 transition-all"
        >
          {isLastSection ? 'Complete & Continue' : 'Next Section'}
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};

export default SectionedLearningContent;
