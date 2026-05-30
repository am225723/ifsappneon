import { BookOpen, Users, Heart, Target, Lightbulb, Map } from 'lucide-react';

const CheatSheet = () => {
  return (
    <div className="min-h-screen py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-5xl font-bold mb-4 bg-gradient-to-r from-amber-600 to-emerald-600 bg-clip-text text-transparent">
            IFS Cheat Sheet
          </h1>
          <p className="text-xl text-gray-600">
            Quick reference guide to Internal Family Systems principles and techniques
          </p>
        </div>

        {/* Internal Family Systems Overview */}
        <div className="card mb-8 bg-gradient-to-br from-emerald-50 to-red-50">
          <div className="flex items-center mb-4">
            <Users className="w-8 h-8 text-emerald-600 mr-3" />
            <h2 className="text-3xl font-bold text-gray-800">Internal Family Systems (IFS)</h2>
          </div>
          <p className="text-lg text-gray-700 leading-relaxed">
            IFS is a psychotherapy model that sees the mind as made up of a core Self and various "Parts," 
            each with its own role, working toward internal harmony under the Self's leadership.
          </p>
        </div>

        {/* IFS Parts */}
        <div className="card mb-8">
          <h2 className="text-3xl font-bold text-gray-800 mb-6">IFS Parts</h2>
          <div className="space-y-6">
            <div className="border-l-4 border-yellow-500 pl-6">
              <h3 className="text-2xl font-bold text-yellow-700 mb-2">Self</h3>
              <p className="text-gray-700">
                The core of identity, encompassing essential attributes and capabilities.
              </p>
            </div>
            
            <div className="border-l-4 border-blue-500 pl-6">
              <h3 className="text-2xl font-bold text-blue-700 mb-2">Protective Parts</h3>
              <div className="space-y-3 mt-3">
                <div>
                  <h4 className="text-xl font-semibold text-blue-600">Managers</h4>
                  <p className="text-gray-700">
                    Maintain safety, stability, and emotional balance by regulating daily life.
                  </p>
                </div>
                <div>
                  <h4 className="text-xl font-semibold text-blue-600">Firefighters</h4>
                  <p className="text-gray-700">
                    React to protect the self from intense emotions and threats.
                  </p>
                </div>
              </div>
            </div>

            <div className="border-l-4 border-amber-500 pl-6">
              <h3 className="text-2xl font-bold text-amber-700 mb-2">Vulnerable Parts</h3>
              <div className="mt-3">
                <h4 className="text-xl font-semibold text-amber-600">Exiles</h4>
                <p className="text-gray-700">
                  Carry pain, trauma, and vulnerability, shielded by protective parts.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Therapeutic Techniques */}
        <div className="card mb-8 bg-gradient-to-br from-blue-50 to-amber-50">
          <div className="flex items-center mb-4">
            <Lightbulb className="w-8 h-8 text-amber-600 mr-3" />
            <h2 className="text-3xl font-bold text-gray-800">Therapeutic Techniques</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-white p-6 rounded-lg shadow-md">
              <h3 className="text-xl font-bold text-amber-700 mb-2">Parts Mapping</h3>
              <p className="text-gray-700">
                Clarify the internal system, identifying Part roles and dynamics.
              </p>
            </div>
            <div className="bg-white p-6 rounded-lg shadow-md">
              <h3 className="text-xl font-bold text-amber-700 mb-2">Dialogue with Parts</h3>
              <p className="text-gray-700">
                Communicate with Parts to explore their intentions and histories.
              </p>
            </div>
            <div className="bg-white p-6 rounded-lg shadow-md">
              <h3 className="text-xl font-bold text-amber-700 mb-2">Self-Compassion</h3>
              <p className="text-gray-700">
                Foster the Self's compassionate approach toward all Parts.
              </p>
            </div>
            <div className="bg-white p-6 rounded-lg shadow-md">
              <h3 className="text-xl font-bold text-amber-700 mb-2">Creative Imagery</h3>
              <p className="text-gray-700">
                Utilize visualization to promote healing among Parts.
              </p>
            </div>
          </div>
        </div>

        {/* Therapy Goals */}
        <div className="card mb-8">
          <div className="flex items-center mb-4">
            <Target className="w-8 h-8 text-green-600 mr-3" />
            <h2 className="text-3xl font-bold text-gray-800">Therapy Goals</h2>
          </div>
          <ul className="space-y-3">
            <li className="flex items-start">
              <span className="text-green-600 mr-3 text-xl">•</span>
              <span className="text-gray-700">
                Empower the Self to lead with understanding and compassion.
              </span>
            </li>
            <li className="flex items-start">
              <span className="text-green-600 mr-3 text-xl">•</span>
              <span className="text-gray-700">
                Rebalance internal relationships, allowing Parts to release their burdens.
              </span>
            </li>
            <li className="flex items-start">
              <span className="text-green-600 mr-3 text-xl">•</span>
              <span className="text-gray-700">
                Transform Parts' roles from dysfunctional to healthy, cooperative functions.
              </span>
            </li>
            <li className="flex items-start">
              <span className="text-green-600 mr-3 text-xl">•</span>
              <span className="text-gray-700">
                Facilitate internal peace through the integration of all Parts.
              </span>
            </li>
          </ul>
        </div>

        {/* Treatment Approaches */}
        <div className="card mb-8 bg-gradient-to-br from-yellow-50 to-orange-50">
          <div className="flex items-center mb-4">
            <Heart className="w-8 h-8 text-orange-600 mr-3" />
            <h2 className="text-3xl font-bold text-gray-800">Treatment Approaches</h2>
          </div>
          <div className="space-y-4">
            <div className="bg-white p-6 rounded-lg shadow-md">
              <h3 className="text-xl font-bold text-orange-700 mb-2">Direct Access</h3>
              <p className="text-gray-700">
                Engage with Parts directly to gain insight into their roles.
              </p>
            </div>
            <div className="bg-white p-6 rounded-lg shadow-md">
              <h3 className="text-xl font-bold text-orange-700 mb-2">Witnessing</h3>
              <p className="text-gray-700">
                Observe Part interactions without judgment or merging.
              </p>
            </div>
            <div className="bg-white p-6 rounded-lg shadow-md">
              <h3 className="text-xl font-bold text-orange-700 mb-2">Unburdening</h3>
              <p className="text-gray-700">
                Release Parts from their painful emotions and limiting beliefs.
              </p>
            </div>
          </div>
        </div>

        {/* 6 F's Approach */}
        <div className="card bg-gradient-to-br from-amber-600 to-emerald-600 text-white">
          <div className="flex items-center mb-4">
            <Map className="w-8 h-8 mr-3" />
            <h2 className="text-3xl font-bold">6 F's Approach</h2>
          </div>
          <p className="text-lg mb-6 text-amber-100">
            The 6 F's Approach entails finding a part within, focusing on it, fleshing out its details and emotions, 
            feeling and accepting its impact, befriending it to understand its intentions, and addressing its fears 
            about role changes, facilitating a deep engagement with your inner self.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {['Find', 'Focus', 'Flesh Out', 'Feel Toward', 'Befriend', 'Fears'].map((step, index) => (
              <div key={index} className="bg-white bg-opacity-20 backdrop-blur-lg p-4 rounded-lg">
                <div className="text-2xl font-bold mb-2">{index + 1}. {step}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default CheatSheet;