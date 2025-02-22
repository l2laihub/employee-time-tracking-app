import React from 'react';
import { motion } from 'framer-motion';

const Demo: React.FC = () => {
  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="container mx-auto px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="max-w-4xl mx-auto"
        >
          <h1 className="text-4xl font-bold text-center mb-8">
            ClockFlow Interactive Demo
          </h1>
          
          <div className="bg-white rounded-xl shadow-lg p-8 mb-8">
            <h2 className="text-2xl font-semibold mb-4">Try These Features:</h2>
            
            {/* Time Entry Demo */}
            <div className="mb-8">
              <h3 className="text-xl font-semibold mb-3">Time Entry</h3>
              <div className="bg-gray-50 p-6 rounded-lg">
                <div className="flex items-center justify-between mb-4">
                  <div className="text-lg">Current Time: {new Date().toLocaleTimeString()}</div>
                  <button className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition">
                    Clock In
                  </button>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-white p-4 rounded-lg shadow-sm">
                    <div className="font-semibold mb-2">Today's Hours</div>
                    <div className="text-2xl">0:00</div>
                  </div>
                  <div className="bg-white p-4 rounded-lg shadow-sm">
                    <div className="font-semibold mb-2">Week Total</div>
                    <div className="text-2xl">40:00</div>
                  </div>
                </div>
              </div>
            </div>

            {/* PTO Request Demo */}
            <div className="mb-8">
              <h3 className="text-xl font-semibold mb-3">PTO Management</h3>
              <div className="bg-gray-50 p-6 rounded-lg">
                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div className="bg-white p-4 rounded-lg shadow-sm">
                    <div className="font-semibold mb-2">Available PTO</div>
                    <div className="text-2xl">15 days</div>
                  </div>
                  <div className="bg-white p-4 rounded-lg shadow-sm">
                    <div className="font-semibold mb-2">Used PTO</div>
                    <div className="text-2xl">5 days</div>
                  </div>
                </div>
                <button className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition">
                  Request Time Off
                </button>
              </div>
            </div>

            {/* Reports Demo */}
            <div>
              <h3 className="text-xl font-semibold mb-3">Analytics Dashboard</h3>
              <div className="bg-gray-50 p-6 rounded-lg">
                <div className="grid grid-cols-3 gap-4">
                  <div className="bg-white p-4 rounded-lg shadow-sm">
                    <div className="font-semibold mb-2">Attendance Rate</div>
                    <div className="text-2xl">98%</div>
                  </div>
                  <div className="bg-white p-4 rounded-lg shadow-sm">
                    <div className="font-semibold mb-2">Overtime Hours</div>
                    <div className="text-2xl">2.5</div>
                  </div>
                  <div className="bg-white p-4 rounded-lg shadow-sm">
                    <div className="font-semibold mb-2">On Time %</div>
                    <div className="text-2xl">95%</div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="text-center">
            <p className="text-xl mb-6">
              Ready to streamline your workforce management?
            </p>
            <button 
              onClick={() => window.location.href = '/signup'}
              className="bg-blue-600 text-white px-8 py-3 rounded-lg font-semibold hover:bg-blue-700 transition"
            >
              Start Free Trial
            </button>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default Demo;