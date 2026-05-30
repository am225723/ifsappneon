import { useState } from 'react';
import { eightCs, fivePs } from '../data/ifsData';
import { Sparkles, Star } from 'lucide-react';

const Qualities = () => {
  const [activeTab, setActiveTab] = useState('8cs');

  return (
    <div className="min-h-screen py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="flex justify-center mb-6">
            <div className="w-20 h-20 bg-gradient-to-br from-yellow-500 to-orange-500 rounded-full flex items-center justify-center shadow-xl">
              <Sparkles className="w-12 h-12 text-white" />
            </div>
          </div>
          <h1 className="text-5xl font-bold mb-4 bg-gradient-to-r from-yellow-600 to-orange-600 bg-clip-text text-transparent">
            Qualities of Self
          </h1>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            The 8 C's and 5 P's embody essential qualities for a healthy mental state and resilience. 
            They act as indicators to measure how much the Self guides responses and navigates challenges.
          </p>
        </div>

        {/* Tab Navigation */}
        <div className="flex justify-center mb-12">
          <div className="bg-white rounded-full shadow-lg p-2 inline-flex space-x-2">
            <button
              onClick={() => setActiveTab('8cs')}
              className={`px-8 py-3 rounded-full font-semibold transition-all duration-300 ${
                activeTab === '8cs'
                  ? 'bg-gradient-to-r from-yellow-500 to-orange-500 text-white shadow-md'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              8 C's of Self
            </button>
            <button
              onClick={() => setActiveTab('5ps')}
              className={`px-8 py-3 rounded-full font-semibold transition-all duration-300 ${
                activeTab === '5ps'
                  ? 'bg-gradient-to-r from-amber-500 to-emerald-500 text-white shadow-md'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              5 P's of Self
            </button>
          </div>
        </div>

        {/* 8 C's Content */}
        {activeTab === '8cs' && (
          <div className="space-y-8">
            <div className="card bg-gradient-to-br from-yellow-50 to-orange-50">
              <h2 className="text-3xl font-bold text-gray-800 mb-4">The 8 C's of the Self</h2>
              <p className="text-lg text-gray-700 leading-relaxed">
                The 8 C's of the Self—<strong>calmness, curiosity, compassion, confidence, courage, clarity, 
                creativity, and connectedness</strong>—embody essential qualities for a healthy mental state and resilience. 
                They also act as indicators to measure how much the Self guides responses and navigates challenges, 
                emphasizing a comprehensive approach to well-being.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {eightCs.map((quality, index) => (
                <div
                  key={index}
                  className={`part-card bg-gradient-to-br ${quality.color} text-white`}
                >
                  <div className="flex items-center mb-4">
                    <div className="w-12 h-12 bg-white bg-opacity-30 backdrop-blur-lg rounded-full flex items-center justify-center mr-4">
                      <Star className="w-6 h-6" />
                    </div>
                    <h3 className="text-2xl font-bold">{quality.title}</h3>
                  </div>
                  <p className="text-white text-opacity-95 leading-relaxed">
                    {quality.description}
                  </p>
                </div>
              ))}
            </div>

            <div className="card bg-gradient-to-br from-orange-600 to-red-600 text-white">
              <h3 className="text-2xl font-bold mb-4">Why the 8 C's Matter</h3>
              <p className="text-lg leading-relaxed text-orange-100">
                When you're in Self-energy, these qualities naturally emerge. They're not something you have to force 
                or fake—they're your authentic nature when your parts trust you to lead. The more you practice 
                Self-leadership, the more these qualities will shine through in your daily life.
              </p>
            </div>
          </div>
        )}

        {/* 5 P's Content */}
        {activeTab === '5ps' && (
          <div className="space-y-8">
            <div className="card bg-gradient-to-br from-amber-50 to-emerald-50">
              <h2 className="text-3xl font-bold text-gray-800 mb-4">The 5 P's of the Self</h2>
              <p className="text-lg text-gray-700 leading-relaxed">
                The 5 P's—<strong>patience, persistence, presence, playfulness, and peace</strong>—strengthen the Self's 
                stability and toughness. They highlight waiting calmly, sticking to challenges, living in the now, 
                enjoying healing, and keeping inner calm, offering a straightforward path to overall well-being.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {fivePs.map((quality, index) => {
                const colors = [
                  'from-amber-400 to-amber-600',
                  'from-emerald-400 to-emerald-600',
                  'from-rose-400 to-rose-600',
                  'from-fuchsia-400 to-fuchsia-600',
                  'from-violet-400 to-violet-600'
                ];
                return (
                  <div
                    key={index}
                    className={`part-card bg-gradient-to-br ${colors[index]} text-white`}
                  >
                    <div className="flex items-center mb-4">
                      <div className="w-12 h-12 bg-white bg-opacity-30 backdrop-blur-lg rounded-full flex items-center justify-center mr-4">
                        <Sparkles className="w-6 h-6" />
                      </div>
                      <h3 className="text-2xl font-bold">{quality.title}</h3>
                    </div>
                    <p className="text-white text-opacity-95 leading-relaxed">
                      {quality.description}
                    </p>
                  </div>
                );
              })}
            </div>

            <div className="card bg-gradient-to-br from-amber-600 to-emerald-600 text-white">
              <h3 className="text-2xl font-bold mb-4">Cultivating the 5 P's</h3>
              <p className="text-lg leading-relaxed text-amber-100 mb-4">
                The 5 P's are practices that strengthen your Self-leadership over time. They're not about perfection—
                they're about progress. Each time you choose patience over reactivity, persistence over giving up, 
                or presence over distraction, you're building your capacity for Self-led living.
              </p>
              <p className="text-lg leading-relaxed text-amber-100">
                These qualities work together with the 8 C's to create a solid foundation for healing and growth. 
                When you embody these qualities, your parts feel safe enough to trust your leadership.
              </p>
            </div>
          </div>
        )}

        {/* Integration Section */}
        <div className="card mt-12 bg-gradient-to-br from-yellow-100 to-orange-100">
          <h2 className="text-3xl font-bold text-gray-800 mb-4">Integrating the Qualities</h2>
          <div className="space-y-4 text-gray-700">
            <p className="text-lg leading-relaxed">
              <strong>Self-Assessment:</strong> Regularly check in with yourself. Which of these qualities do you 
              feel connected to? Which ones feel distant? This awareness helps you understand when you're in 
              Self-energy and when your parts have taken over.
            </p>
            <p className="text-lg leading-relaxed">
              <strong>Practice:</strong> You can't force these qualities, but you can create conditions for them 
              to emerge. When you notice a part has taken over (anxiety, anger, perfectionism), pause and ask: 
              "What would it be like to approach this situation with curiosity? With compassion?"
            </p>
            <p className="text-lg leading-relaxed">
              <strong>Trust the Process:</strong> As you work with your parts and help them unburden, these 
              qualities will naturally become more accessible. They're not goals to achieve—they're your natural 
              state when your parts trust you to lead.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Qualities;