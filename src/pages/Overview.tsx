import React from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { FiClock, FiUsers, FiCalendar, FiPieChart, FiShield, FiSettings } from 'react-icons/fi';
import { FaCheckCircle, FaBuilding, FaHospital, FaStore, FaStar, FaAward, FaUserShield } from 'react-icons/fa';
import { clearOnboardingState } from '../utils/onboardingStorage';

const features = [
  {
    icon: <FiClock className="w-8 h-8" />,
    title: "Time Tracking",
    description: "Effortless clock in/out, break management, and overtime tracking for your entire workforce.",
    details: [
      "Intuitive clock in/out interface",
      "Automated break tracking",
      "Overtime calculations",
      "Mobile time tracking",
      "GPS location verification",
      "Offline mode support"
    ]
  },
  {
    icon: <FiUsers className="w-8 h-8" />,
    title: "Employee Management",
    description: "Comprehensive tools for managing profiles, roles, departments, and performance tracking.",
    details: [
      "Detailed employee profiles",
      "Role-based access control",
      "Department organization",
      "Performance metrics",
      "Custom fields",
      "Bulk operations"
    ]
  },
  {
    icon: <FiCalendar className="w-8 h-8" />,
    title: "PTO Management",
    description: "Streamlined leave requests, approvals, and balance tracking with calendar integration.",
    details: [
      "Leave request workflow",
      "Balance tracking",
      "Calendar integration",
      "Accrual rules",
      "Holiday management",
      "Multi-level approvals"
    ]
  },
  {
    icon: <FiPieChart className="w-8 h-8" />,
    title: "Advanced Analytics",
    description: "Powerful reporting tools for cost analysis, time utilization, and attendance tracking.",
    details: [
      "Real-time dashboards",
      "Custom report builder",
      "Cost analysis",
      "Attendance insights",
      "Export capabilities",
      "Trend analysis"
    ]
  },
  {
    icon: <FiShield className="w-8 h-8" />,
    title: "Compliance & Security",
    description: "Built-in labor law compliance, role-based access, and comprehensive audit trails.",
    details: [
      "Labor law compliance",
      "Working hours tracking",
      "Break enforcement",
      "Audit logging",
      "Data encryption",
      "Regular backups"
    ]
  },
  {
    icon: <FiSettings className="w-8 h-8" />,
    title: "Customization",
    description: "Flexible workflows, custom fields, and integrations to match your business needs.",
    details: [
      "Custom workflows",
      "Field customization",
      "API access",
      "Integration options",
      "White-labeling",
      "Custom rules"
    ]
  }
];

const pricingTiers = [
  {
    name: "Starter",
    description: "Perfect for small teams",
    price: "Free",
    highlight: "Most Popular for Small Teams",
    features: [
      "Up to 5 employees",
      "Basic time tracking",
      "Simple timesheet generation",
      "Basic reporting",
      "Mobile-responsive interface",
      "PTO management",
      "Employee profiles",
      "Email support"
    ]
  },
  {
    name: "Professional",
    description: "For growing businesses",
    price: "$12/user/mo",
    highlight: "Best for Growing Teams",
    features: [
      "Unlimited employees",
      "Advanced time tracking",
      "Job location tracking",
      "Custom fields",
      "Advanced reporting",
      "Timesheet approvals",
      "Priority email support",
      "30-day data retention"
    ]
  },
  {
    name: "Business",
    description: "Advanced features for larger teams",
    price: "$20/user/mo",
    highlight: "Recommended for Medium-Large Teams",
    features: [
      "Advanced analytics",
      "Custom approval workflows",
      "API access",
      "Advanced integrations",
      "Custom report builder",
      "Phone support",
      "90-day data retention",
      "Labor law compliance"
    ]
  }
];

const useCases = [
  {
    icon: <FaHospital className="w-12 h-12 text-blue-600" />,
    industry: "Healthcare",
    description: "Streamline staff scheduling and ensure compliance with healthcare regulations.",
    benefits: [
      "Staff scheduling optimization",
      "Compliance tracking",
      "Multiple location management",
      "Integration with healthcare systems"
    ]
  },
  {
    icon: <FaBuilding className="w-12 h-12 text-blue-600" />,
    industry: "Construction",
    description: "Track time across multiple job sites and manage mobile workforce efficiently.",
    benefits: [
      "Job site time tracking",
      "Mobile clock-in/out",
      "Project time allocation",
      "Equipment usage tracking"
    ]
  },
  {
    icon: <FaStore className="w-12 h-12 text-blue-600" />,
    industry: "Retail",
    description: "Optimize workforce scheduling and track labor costs effectively.",
    benefits: [
      "Shift management",
      "Break tracking",
      "Labor cost optimization",
      "Multi-store support"
    ]
  },
  {
    icon: <FaBuilding className="w-12 h-12 text-blue-600" />,
    industry: "Contracting",
    description: "Manage contractor schedules and track project-based work hours efficiently.",
    benefits: [
      "Contractor time tracking",
      "Project-based billing",
      "Contract compliance",
      "Performance monitoring"
    ]
  }
];

const trustIndicators = [
  {
    icon: <FaStar className="w-6 h-6 text-yellow-400" />,
    title: "4.8/5 Average Rating",
    description: "From over 1,000+ reviews"
  },
  {
    icon: <FaUserShield className="w-6 h-6 text-green-500" />,
    title: "SOC 2 Compliant",
    description: "Enterprise-grade security"
  },
  {
    icon: <FaAward className="w-6 h-6 text-blue-500" />,
    title: "Industry Leader",
    description: "Trusted by 10,000+ businesses"
  }
];

const fadeInUp = {
  initial: { opacity: 0, y: 20 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true },
  transition: { duration: 0.5 }
};

const Overview: React.FC = () => {
  const navigate = useNavigate();

  const handleStartFreeTrial = () => {
    clearOnboardingState();
    navigate('/onboarding');
  };

  const handleViewDemo = () => {
    navigate('/demo');
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Hero Section */}
      <section className="bg-gradient-to-b from-blue-900 to-blue-700 text-white py-24">
        <div className="container mx-auto px-4">
          <motion.div 
            className="text-center"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <h1 className="text-4xl md:text-6xl font-bold mb-6">
              Transform Your Workforce Management
            </h1>
            <p className="text-xl text-blue-100 mb-8 max-w-2xl mx-auto">
              ClockFlow combines powerful time tracking with comprehensive workforce management tools to help your business thrive.
            </p>
            <div className="flex justify-center gap-4">
              <button
                onClick={handleStartFreeTrial}
                className="bg-white text-blue-700 px-8 py-3 rounded-lg font-semibold hover:bg-blue-50 transition shadow-lg"
              >
                Get Started Now
              </button>
              <button
                onClick={handleViewDemo}
                className="border-2 border-white text-white px-8 py-3 rounded-lg font-semibold hover:bg-white hover:text-blue-700 transition"
              >
                View Demo
              </button>
            </div>
            
            {/* Trust Indicators */}
            <div className="mt-16 grid md:grid-cols-3 gap-8 max-w-4xl mx-auto">
              {trustIndicators.map((indicator, index) => (
                <motion.div
                  key={index}
                  {...fadeInUp}
                  transition={{ delay: index * 0.1 }}
                  className="flex flex-col items-center bg-white bg-opacity-10 rounded-lg p-6"
                >
                  <div className="mb-3">{indicator.icon}</div>
                  <h3 className="font-semibold mb-1">{indicator.title}</h3>
                  <p className="text-blue-100 text-sm">{indicator.description}</p>
                </motion.div>
              ))}
            </div>
          </motion.div>
        </div>
      </section>

      {/* Features Grid */}
      <section className="py-20">
        <div className="container mx-auto px-4">
          <h2 className="text-3xl font-bold text-center mb-4">Comprehensive Features for Modern Workforce</h2>
          <p className="text-gray-600 text-center mb-12 max-w-2xl mx-auto">
            Discover how ClockFlow's powerful features can streamline your workforce management and boost productivity.
          </p>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {features.map((feature, index) => (
              <motion.div
                key={index}
                {...fadeInUp}
                transition={{ delay: index * 0.1 }}
                className="bg-white p-6 rounded-xl shadow-sm hover:shadow-md transition"
              >
                <div className="text-blue-600 mb-4">{feature.icon}</div>
                <h3 className="text-xl font-semibold mb-2">{feature.title}</h3>
                <p className="text-gray-600 mb-4">{feature.description}</p>
                <ul className="space-y-2">
                  {feature.details.map((detail, i) => (
                    <li key={i} className="flex items-center text-gray-600">
                      <FaCheckCircle className="text-green-500 mr-2 flex-shrink-0" />
                      <span>{detail}</span>
                    </li>
                  ))}
                </ul>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section className="bg-white py-20">
        <div className="container mx-auto px-4">
          <h2 className="text-3xl font-bold text-center mb-4">Simple, Transparent Pricing</h2>
          <p className="text-gray-600 text-center mb-12 max-w-2xl mx-auto">
            Choose the perfect plan for your business. All plans include core features with no hidden costs.
          </p>
          <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            {pricingTiers.map((tier, index) => (
              <motion.div
                key={index}
                {...fadeInUp}
                transition={{ delay: index * 0.1 }}
                className={`bg-white rounded-xl p-6 ${
                  tier.name === "Professional" ? "border-2 border-blue-600 shadow-xl" : "border border-gray-200"
                }`}
              >
                {tier.highlight && (
                  <div className="text-blue-600 text-sm font-semibold mb-4">{tier.highlight}</div>
                )}
                <h3 className="text-xl font-semibold mb-2">{tier.name}</h3>
                <p className="text-gray-600 mb-4">{tier.description}</p>
                <div className="text-3xl font-bold mb-6">{tier.price}</div>
                <ul className="space-y-3 mb-6">
                  {tier.features.map((feature, i) => (
                    <li key={i} className="flex items-center">
                      <FaCheckCircle className="text-green-500 mr-2 flex-shrink-0" />
                      <span className="text-gray-700">{feature}</span>
                    </li>
                  ))}
                </ul>
                <button
                  onClick={handleStartFreeTrial}
                  className={`w-full py-2 rounded-lg font-semibold transition ${
                    tier.name === "Professional"
                      ? "bg-blue-600 text-white hover:bg-blue-700"
                      : "bg-blue-100 text-blue-600 hover:bg-blue-200"
                  }`}
                >
                  Get Started
                </button>
              </motion.div>
            ))}
          </div>
          <div className="text-center mt-8">
            <p className="text-gray-600">
              Need a custom solution? {" "}
              <button className="text-blue-600 font-semibold hover:text-blue-700">
                Contact our sales team
              </button>
            </p>
          </div>
        </div>
      </section>

      {/* Use Cases */}
      <section className="py-20">
        <div className="container mx-auto px-4">
          <h2 className="text-3xl font-bold text-center mb-4">Perfect For Every Industry</h2>
          <p className="text-gray-600 text-center mb-12 max-w-2xl mx-auto">
            See how businesses across different industries leverage ClockFlow to optimize their operations.
          </p>
          <div className="grid md:grid-cols-3 gap-8">
            {useCases.map((useCase, index) => (
              <motion.div
                key={index}
                {...fadeInUp}
                transition={{ delay: index * 0.1 }}
                className="bg-white p-8 rounded-xl shadow-sm hover:shadow-md transition"
              >
                <div className="mb-6">{useCase.icon}</div>
                <h3 className="text-xl font-semibold mb-4">{useCase.industry}</h3>
                <p className="text-gray-600 mb-6">{useCase.description}</p>
                <ul className="space-y-3">
                  {useCase.benefits.map((benefit, i) => (
                    <li key={i} className="flex items-center text-gray-600">
                      <FaCheckCircle className="text-green-500 mr-2 flex-shrink-0" />
                      {benefit}
                    </li>
                  ))}
                </ul>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Call to Action */}
      <section className="bg-gradient-to-r from-blue-700 to-blue-900 text-white py-20">
        <div className="container mx-auto px-4 text-center">
          <motion.div
            {...fadeInUp}
            className="max-w-3xl mx-auto"
          >
            <h2 className="text-3xl font-bold mb-6">Ready to Transform Your Workforce Management?</h2>
            <p className="text-xl mb-8">
              Join thousands of businesses that trust ClockFlow for their time tracking and workforce management needs.
            </p>
            <div className="flex justify-center gap-4">
              <button
                onClick={handleStartFreeTrial}
                className="bg-white text-blue-700 px-8 py-3 rounded-lg font-semibold hover:bg-blue-50 transition shadow-lg"
              >
                Get Started Now
              </button>
              <button
                onClick={handleViewDemo}
                className="border-2 border-white text-white px-8 py-3 rounded-lg font-semibold hover:bg-white hover:text-blue-700 transition"
              >
                Schedule a Demo
              </button>
            </div>
          </motion.div>
        </div>
      </section>
    </div>
  );
};

export default Overview;