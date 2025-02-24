import React from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { FiClock, FiUsers, FiCalendar, FiPieChart, FiShield, FiSettings } from 'react-icons/fi';
import { FaCheckCircle, FaBuilding, FaHospital, FaStore, FaStar, FaAward, FaUserShield, FaBriefcase, FaIndustry } from 'react-icons/fa';
import { clearOnboardingState } from '../utils/onboardingStorage';
import { Button } from '../components/design-system/Button';
import { Card } from '../components/design-system/Card';

const features = [
  {
    icon: <FiClock className="w-8 h-8" />,
    title: "Time Tracking",
    description: "Efficient time tracking with break management and job location features.",
    details: [
      "Simple clock in/out interface",
      "Basic break tracking",
      "Job location tracking",
      "Status management",
      "Timesheet generation",
      "Mobile access"
    ]
  },
  {
    icon: <FiUsers className="w-8 h-8" />,
    title: "Employee Management",
    description: "Comprehensive employee profile and role management system.",
    details: [
      "Employee profiles (CRUD)",
      "Role assignments",
      "Department organization",
      "Basic access control",
      "Location assignments",
      "Status tracking"
    ]
  },
  {
    icon: <FiCalendar className="w-8 h-8" />,
    title: "PTO Management",
    description: "Basic leave management system with approval workflows.",
    details: [
      "Leave request submission",
      "Basic approval workflow",
      "Status updates",
      "Request listing",
      "Balance viewing",
      "Simple notifications"
    ]
  },
  {
    icon: <FiPieChart className="w-8 h-8" />,
    title: "Reporting",
    description: "Essential reporting tools for time and attendance tracking.",
    details: [
      "Weekly hours reports",
      "Employee details",
      "CSV exports",
      "Time entry summaries",
      "Basic filters",
      "Status reports"
    ]
  },
  {
    icon: <FiShield className="w-8 h-8" />,
    title: "Location Management",
    description: "Job location tracking with geofencing capabilities.",
    details: [
      "Location management",
      "User assignments",
      "Geofence checking",
      "Distance calculations",
      "Location verification",
      "Basic tracking"
    ]
  },
  {
    icon: <FiSettings className="w-8 h-8" />,
    title: "Basic Settings",
    description: "Essential configuration options for your organization.",
    details: [
      "Organization setup",
      "User management",
      "Basic permissions",
      "Profile settings",
      "Notification preferences",
      "System preferences"
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
      "Basic time tracking (clock in/out)",
      "Simple timesheet generation",
      "Employee profiles",
      "Basic reporting (weekly hours, CSV exports)",
      "Up to 5 employees",
      "Mobile-responsive interface",
      "Email support"
    ]
  },
  {
    name: "Professional",
    description: "For growing businesses",
    price: "$7/user/mo",
    highlight: "Best for Growing Teams",
    features: [
      "Unlimited employees",
      "Advanced time tracking with breaks",
      "Job location tracking with geofencing",
      "Department organization",
      "Role-based access control",
      "Basic PTO management",
      "Location management",
      "Advanced reporting with filters",
      "Priority email support"
    ]
  },
  {
    name: "Business",
    description: "Advanced features for larger teams",
    price: "$20/user/mo",
    highlight: "Coming Soon - Q2 2025",
    features: [
      "Advanced PTO management",
      "Calendar integration",
      "Comprehensive approval workflows",
      "Data retention policies",
      "Advanced analytics",
      "Custom report builder",
      "API access",
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
  },
  {
    icon: <FaBriefcase className="w-12 h-12 text-blue-600" />,
    industry: "Professional Services",
    description: "Streamline billable hours tracking and project management for consulting firms.",
    benefits: [
      "Client billing automation",
      "Project time allocation",
      "Resource utilization",
      "Productivity analytics"
    ]
  },
  {
    icon: <FaIndustry className="w-12 h-12 text-blue-600" />,
    industry: "Manufacturing",
    description: "Optimize workforce scheduling and track production time across multiple shifts.",
    benefits: [
      "Shift management",
      "Production time tracking",
      "Equipment utilization",
      "Labor cost analysis"
    ]
  }
];

const trustIndicators = [
  {
    icon: <FaStar className="w-6 h-6 text-yellow-400" />,
    title: "4.8/5 Average Rating",
    description: "From over 1,000+ satisfied customers"
  },
  {
    icon: <FaAward className="w-6 h-6 text-blue-500" />,
    title: "Industry Leader",
    description: "Trusted by 10,000+ businesses"
  },
  {
    icon: <FaUserShield className="w-6 h-6 text-green-500" />,
    title: "Enterprise Security",
    description: "Bank-level data protection"
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

  const handleContactUs = () => {
    // Using verified sender email from email service
    const emailAddress = 'l2laihub@gmail.com';
    const subject = encodeURIComponent('Interested in ClockFlow');
    const body = encodeURIComponent('Hi, I would like to learn more about ClockFlow for my business.');
    window.location.href = `mailto:${emailAddress}?subject=${subject}&body=${body}`;
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Hero Section */}
      <section className="bg-[#4338CA] text-white py-32">
        <div className="container mx-auto px-4">
          <motion.div
            className="text-center"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <h1 className="text-5xl md:text-7xl font-bold mb-6 max-w-5xl mx-auto leading-tight text-white">
              Empower Your Team, Maximize Productivity
            </h1>
            <p className="text-2xl text-white/90 mb-8 max-w-3xl mx-auto">
              The all-in-one platform that streamlines time tracking, simplifies timesheet generation, empowers productivity, and boosts team efficiency—trusted by many businesses.
            </p>
            <div className="flex flex-wrap justify-center gap-4 mb-12">
              <div className="bg-white/10 backdrop-blur-sm rounded-lg px-6 py-3">
                <span className="text-2xl font-bold text-green-400">98%</span>
                <p className="text-sm text-white/80">Time Saved in Payroll</p>
              </div>
              <div className="bg-white/10 backdrop-blur-sm rounded-lg px-6 py-3">
                <span className="text-2xl font-bold text-green-400">2.5x</span>
                <p className="text-sm text-white/80">Productivity Boost</p>
              </div>
              <div className="bg-white/10 backdrop-blur-sm rounded-lg px-6 py-3">
                <span className="text-2xl font-bold text-green-400">15min</span>
                <p className="text-sm text-white/80">Quick Setup</p>
              </div>
            </div>
            <div className="flex justify-center gap-6">
              <Button
                variant="primary"
                size="lg"
                onClick={handleStartFreeTrial}
                className="border-2 border-green-500 bg-white text-[#4338CA] hover:bg-white/10 hover:text-white px-8 py-4 text-lg font-semibold"
              >
                Get Started Now for Free
              </Button>
              <Button
                variant="secondary"
                size="lg"
                onClick={handleContactUs}
                className="border-2 border-blue-500 text-[#4338CA] hover:bg-white/10 hover:text-white px-8 py-4 text-lg font-semibold shadow-lg"
              >
                Schedule a Demo
              </Button>
            </div>
            
            {/* Trust Indicators */}
            <div className="mt-24 grid md:grid-cols-3 gap-8 max-w-4xl mx-auto">
              {trustIndicators.map((indicator, index) => (
                <motion.div
                  key={index}
                  {...fadeInUp}
                  transition={{ delay: index * 0.1 }}
                  className="flex flex-col items-center bg-white/10 backdrop-blur-sm rounded-2xl p-8"
                >
                  <div className="mb-4 text-white/90">{indicator.icon}</div>
                  <h3 className="font-semibold text-lg mb-2">{indicator.title}</h3>
                  <p className="text-white/80">{indicator.description}</p>
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
              >
                <Card
                  interactive
                  elevation="sm"
                  className="h-full hover:border-blue-200"
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
                </Card>
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
              >
                <Card
                  interactive
                  elevation={tier.name === "Professional" ? "md" : "sm"}
                  className={tier.name === "Professional" ? "border-2 border-blue-600" : ""}
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
                  <Button
                    variant={tier.name === "Professional" ? "primary" : "secondary"}
                    fullWidth
                    onClick={handleStartFreeTrial}
                  >
                    Get Started
                  </Button>
                </Card>
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
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8 max-w-7xl mx-auto">
            {useCases.map((useCase, index) => (
              <motion.div
                key={index}
                {...fadeInUp}
                transition={{ delay: index * 0.1 }}
              >
                <Card
                  interactive
                  elevation="sm"
                  className="h-full hover:border-blue-200"
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
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Call to Action */}
      <section className="bg-[#4338CA] text-white py-32">
        <div className="container mx-auto px-4 text-center">
          <motion.div
            {...fadeInUp}
            className="max-w-4xl mx-auto"
          >
            <h2 className="text-4xl md:text-5xl text-white/90 font-bold mb-8">Ready to Transform Your Workforce Management?</h2>
            <p className="text-xl text-white/90 mb-12">
              Join thousands of businesses that trust ClockFlow for their time tracking and workforce management needs.
            </p>
            <div className="flex justify-center gap-6">
              <Button
                variant="primary"
                size="lg"
                onClick={handleStartFreeTrial}
                className="border-2 border-green-500 bg-white text-[#4338CA] hover:bg-white/10 hover:text-white px-8 py-4 text-lg font-semibold"
              >
                Get Started Now
              </Button>
              <Button
                variant="secondary"
                size="lg"
                onClick={handleContactUs}
                className="border-2 border-blue-500 text-[#4338CA] hover:bg-white/10 hover:text-white px-8 py-4 text-lg font-semibold shadow-lg"
              >
                Book a Demo
              </Button>
            </div>
          </motion.div>
        </div>
      </section>
    </div>
  );
};

export default Overview;