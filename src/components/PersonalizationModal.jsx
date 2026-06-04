import { useState, useEffect } from 'react';
import { 
  X, 
  Sparkles, 
  Heart, 
  Target, 
  Lightbulb, 
  BookOpen,
  ArrowRight,
  CheckCircle,
  Star,
  Loader2
} from 'lucide-react';
import personalizationAIService from '../lib/personalizationAI';

const PersonalizationModal = ({ 
  isOpen, 
  onClose, 
  curriculum, 
  assessmentResults,
  onStartJourney 
}) => {
  const [personalization, setPersonalization] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (isOpen && assessmentResults) {
      generatePersonalization();
    }
  }, [isOpen, assessmentResults]);

  const generatePersonalization = async () => {
    setLoading(true);
    try {
      const sortedResults = [...assessmentResults].sort((a, b) => b.score - a.score);
      const primaryWound = sortedResults[0];
      const secondaryWound = sortedResults[1];
      
      const woundProfile = {
        primaryWound: {
          id: primaryWound.id,
          name: primaryWound.title,
          score: primaryWound.score
        },
        secondaryWound: secondaryWound ? {
          id: secondaryWound.id,
          name: secondaryWound.title,
          score: secondaryWound.score
        } : null,
        intensity: getIntensity(primaryWound.score),
        scores: sortedResults.map(r => ({
          id: r.id,
          name: r.title,
          score: r.score,
          percentage: Math.round((r.score / 24) * 100)
        }))
      };

      const result = await personalizationAIService.generatePersonalizedGuidance(woundProfile);
      setPersonalization(result);
    } catch (error) {
      console.error('Error generating personalization:', error);
    } finally {
      setLoading(false);
    }
  };

  const getIntensity = (score) => {
    if (score >= 20) return 'severe';
    if (score >= 15) return 'high';
    if (score >= 10) return 'moderate';
    if (score >= 5) return 'mild';
    return 'minimal';
  };

  const getIntensityColor = (intensity) => {
    switch (intensity) {
      case 'severe': return 'text-red-600 bg-red-50';
      case 'high': return 'text-orange-600 bg-orange-50';
      case 'moderate': return 'text-yellow-600 bg-yellow-50';
      case 'mild': return 'text-green-600 bg-green-50';
      default: return 'text-blue-600 bg-blue-50';
    }
  };

  if (!isOpen) return null;

  const primaryWound = assessmentResults ? [...assessmentResults].sort((a, b) => b.score - a.score)[0] : null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="relative w-full max-w-2xl max-h-[90vh] overflow-y-auto bg-white rounded-3xl shadow-2xl">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 text-gray-400 hover:text-gray-600 transition-colors"
        >
          <X className="w-6 h-6" />
        </button>

        <div className="p-8">
          <div className="text-center mb-8">
            <div className="w-20 h-20 bg-gradient-to-r from-amber-500 to-emerald-500 rounded-full flex items-center justify-center mx-auto mb-4">
              <Sparkles className="w-10 h-10 text-white" />
            </div>
            <h2 className="text-3xl font-bold text-gray-900 mb-2">
              Your Personalized Healing Journey
            </h2>
            <p className="text-gray-600">
              Based on your assessment, we've created a unique path just for you
            </p>
          </div>

          {loading ? (
            <div className="flex flex-col items-center justify-center py-12">
              <Loader2 className="w-12 h-12 text-amber-600 animate-spin mb-4" />
              <p className="text-gray-600">Creating your personalized experience...</p>
            </div>
          ) : personalization ? (
            <div className="space-y-6">
              <div className="bg-gradient-to-r from-amber-50 to-emerald-50 rounded-2xl p-6 border border-amber-100">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 bg-amber-100 rounded-xl flex items-center justify-center flex-shrink-0">
                    <Heart className="w-6 h-6 text-amber-600" />
                  </div>
                  <div>
                    <h3 className="font-bold text-amber-900 mb-2">Your Wound Profile</h3>
                    <p className="text-amber-800 leading-relaxed">
                      {personalization.summary}
                    </p>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-2xl p-6 border border-gray-200">
                <div className="flex items-center gap-3 mb-4">
                  <Target className="w-6 h-6 text-teal-600" />
                  <h3 className="font-bold text-gray-900">Your Healing Priorities</h3>
                </div>
                <div className="space-y-3">
                  {personalization.priorities?.map((priority, index) => (
                    <div key={index} className="flex items-start gap-3">
                      <CheckCircle className="w-5 h-5 text-teal-500 mt-0.5 flex-shrink-0" />
                      <span className="text-gray-700">{priority}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-amber-50 rounded-2xl p-6 border border-amber-200">
                <div className="flex items-center gap-3 mb-3">
                  <Star className="w-6 h-6 text-amber-600" />
                  <h3 className="font-bold text-amber-900">Your Daily Affirmation</h3>
                </div>
                <p className="text-lg text-amber-800 italic">
                  "{personalization.affirmation}"
                </p>
              </div>

              <div className="bg-blue-50 rounded-2xl p-6 border border-blue-200">
                <div className="flex items-center gap-3 mb-3">
                  <BookOpen className="w-6 h-6 text-blue-600" />
                  <h3 className="font-bold text-blue-900">Your Curriculum Focus</h3>
                </div>
                <p className="text-blue-800 leading-relaxed">
                  {personalization.curriculumFocus}
                </p>
              </div>

              <div className="bg-gray-50 rounded-2xl p-6">
                <h3 className="font-bold text-gray-900 mb-4">What's Been Personalized For You:</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-amber-100 rounded-lg flex items-center justify-center">
                      <CheckCircle className="w-4 h-4 text-amber-600" />
                    </div>
                    <span className="text-gray-700">Module content adapted to your wounds</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-amber-100 rounded-lg flex items-center justify-center">
                      <CheckCircle className="w-4 h-4 text-amber-600" />
                    </div>
                    <span className="text-gray-700">Exercises targeted to your needs</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-amber-100 rounded-lg flex items-center justify-center">
                      <CheckCircle className="w-4 h-4 text-amber-600" />
                    </div>
                    <span className="text-gray-700">Healing goals specific to you</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-amber-100 rounded-lg flex items-center justify-center">
                      <CheckCircle className="w-4 h-4 text-amber-600" />
                    </div>
                    <span className="text-gray-700">Timeline based on intensity level</span>
                  </div>
                </div>
              </div>

              {primaryWound && (
                <div className={`rounded-2xl p-4 ${getIntensityColor(personalization.intensity)}`}>
                  <p className="text-sm font-medium">
                    Wound Intensity: <span className="capitalize">{personalization.intensity}</span> - 
                    Your curriculum has been adjusted accordingly
                  </p>
                </div>
              )}
            </div>
          ) : null}

          <div className="mt-8 flex flex-col sm:flex-row gap-4">
            <button
              onClick={onStartJourney}
              className="flex-1 px-6 py-4 bg-gradient-to-r from-amber-600 to-emerald-600 text-white rounded-xl font-semibold hover:from-amber-700 hover:to-emerald-700 transition-all duration-300 flex items-center justify-center gap-2"
            >
              Begin Your Journey
              <ArrowRight className="w-5 h-5" />
            </button>
            <button
              onClick={onClose}
              className="px-6 py-4 bg-gray-100 text-gray-700 rounded-xl font-semibold hover:bg-gray-200 transition-colors"
            >
              Review Results First
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PersonalizationModal;
