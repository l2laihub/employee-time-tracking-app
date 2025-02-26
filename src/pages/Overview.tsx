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
    description: "Basic job location tracking for your workforce.",
    details: [
      "Location management (CRUD)",
      "User assignments",
      "Basic location tracking",
      "Location assignment"
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
    name: "Free",
    description: "Essential time tracking for small teams",
    price: "Free",
    annualPrice: "Free",
    highlight: "Perfect for Small Teams",
    userLimit: "Up to 5 users",
    features: [
      "Basic time tracking (clock in/out)",
      "Simple timesheet generation",
      "Basic employee profiles",
      "Basic reporting (weekly hours, CSV exports)",
      "Mobile-responsive interface",
      "Community support",
      "7-day data retention"
    ]
  },
  {
    name: "Essentials",
    description: "Streamlined time management with basic reporting",
    price: "$8/user/mo",
    annualPrice: "$6/user/mo",
    annualSavings: "Save 25%",
    highlight: "Best Value for Small Teams",
    userLimit: "Up to 10 users",
    features: [
      "All Free features",
      "Standard time tracking with breaks",
      "Basic job location tracking",
      "Department organization",
      "Standard reports",
      "Basic PTO management",
      "Email support (24hr response)",
      "30-day data retention"
    ]
  },
  {
    name: "Professional",
    description: "Advanced workforce management & analytics",
    price: "$15/user/mo",
    annualPrice: "$12/user/mo",
    annualSavings: "Save 20%",
    highlight: "Best for Growing Teams",
    userLimit: "10-25 users",
    features: [
      "All Essentials features",
      "Advanced time tracking",
      "Standard location tracking",
      "Role-based access control",
      "Standard PTO management",
      "Advanced filters for reporting",
      "Basic integrations",
      "Priority email support",
      "90-day data retention"
    ]
  },
  {
    name: "Business",
    description: "Comprehensive workforce management solution",
    price: "$24/user/mo",
    annualPrice: "$19/user/mo",
    annualSavings: "Save 21%",
    highlight: "Ideal for Larger Teams",
    userLimit: "25-100 users",
    features: [
      "All Professional features",
      "Advanced location management",
      "Custom report builder",
      "Advanced workflows",
      "Advanced PTO management",
      "Labor law compliance",
      "API access",
      "Phone & email support",
      "1-year data retention"
    ]
  },
  {
    name: "Enterprise",
    description: "Enterprise-grade solution with dedicated support",
    price: "Custom Pricing",
    annualPrice: "Custom Pricing",
    highlight: "Tailored for Your Organization",
    userLimit: "100+ users",
    features: [
      "All Business features",
      "Custom feature development",
      "On-premise deployment option",
      "Unlimited data retention",
      "Enterprise-grade security",
      "Custom integrations",
      "Dedicated support team",
      "SLA guarantees",
      "Quarterly business reviews",
      "White-label options"
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

const upcomingFeatures = [
  {
    icon: <FiCalendar className="w-8 h-8" />,
    title: "Advanced PTO Management",
    description: "Comprehensive leave management system with advanced features.",
    details: [
      "Accrual calculations",
      "Balance history tracking",
      "Year-end rollovers",
      "Multiple leave types",
      "Calendar integration",
      "Team availability view"
    ]
  },
  {
    icon: <FiShield className="w-8 h-8" />,
    title: "Advanced Location Management",
    description: "Enhanced location tracking with geofencing and mapping capabilities.",
    details: [
      "Geofence checking",
      "Distance calculations",
      "Map visualization",
      "Geofence editor",
      "Route optimization",
      "Location verification"
    ]
  },
  {
    icon: <FiPieChart className="w-8 h-8" />,
    title: "Enhanced Reporting & Analytics",
    description: "Advanced reporting tools with customization and analytics.",
    details: [
      "Custom report builder",
      "Advanced analytics dashboard",
      "Data visualization tools",
      "Trend analysis",
      "Performance metrics",
      "Export customization"
    ]
  },
  {
    icon: <FiShield className="w-8 h-8" />,
    title: "Advanced System Features",
    description: "Enterprise-grade features for larger organizations.",
    details: [
      "API access",
      "Data retention policies",
      "Comprehensive approval workflows",
      "Advanced integrations",
      "Labor law compliance",
      "Department-level permissions"
    ]
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
  const [billingAnnual, setBillingAnnual] = React.useState(false);
  const [showEnterprisePlans, setShowEnterprisePlans] = React.useState(false);

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

  const handleLogin = () => {
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-gray-50 relative">
      {/* Login Link */}
      <div className="absolute top-4 right-4 z-10">
        <Button
          variant="secondary"
          size="sm"
          onClick={handleLogin}
          className="bg-white/10 backdrop-blur-sm hover:bg-white/20 text-white border border-white/20 px-6 py-2 rounded-full font-medium"
        >
          Login
        </Button>
      </div>
      {/* Hero Section */}
      <section className="bg-gradient-to-br from-[#4338CA] to-[#5850EC] text-white py-24 md:py-32 overflow-hidden relative">
        {/* Background pattern */}
        <div className="absolute inset-0 opacity-10">
          <svg className="w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
            <defs>
              <pattern id="grid" width="8" height="8" patternUnits="userSpaceOnUse">
                <path d="M 8 0 L 0 0 0 8" fill="none" stroke="white" strokeWidth="0.5" />
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#grid)" />
          </svg>
        </div>
        
        <div className="container mx-auto px-4 relative z-10">
          <motion.div
            className="text-center"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <div className="inline-block mb-6 px-4 py-1 bg-white/10 backdrop-blur-sm rounded-full">
              <span className="text-white/90 font-medium">Trusted by 10,000+ businesses worldwide</span>
            </div>
            
            <h1 className="text-5xl md:text-7xl font-bold mb-6 max-w-5xl mx-auto leading-tight text-white tracking-tight">
              Empower Your Team, <span className="text-transparent bg-clip-text bg-gradient-to-r from-green-300 to-blue-300">Maximize Productivity</span>
            </h1>
            
            <p className="text-xl md:text-2xl text-white/90 mb-10 max-w-3xl mx-auto leading-relaxed">
              Transform how your team works with our revolutionary platform that eliminates time-tracking headaches, automates payroll processes, and unlocks hidden productivity—giving you back hours every week while reducing costs by up to 30%.
            </p>
            
            <div className="flex flex-wrap justify-center gap-6 mb-16">
              <div className="bg-white/10 backdrop-blur-sm rounded-xl px-8 py-4 transform transition-transform hover:scale-105">
                <span className="text-3xl font-bold text-green-400">98%</span>
                <p className="text-sm font-medium text-white/80">Time Saved in Payroll</p>
              </div>
              <div className="bg-white/10 backdrop-blur-sm rounded-xl px-8 py-4 transform transition-transform hover:scale-105">
                <span className="text-3xl font-bold text-green-400">2.5x</span>
                <p className="text-sm font-medium text-white/80">Productivity Boost</p>
              </div>
              <div className="bg-white/10 backdrop-blur-sm rounded-xl px-8 py-4 transform transition-transform hover:scale-105">
                <span className="text-3xl font-bold text-green-400">15min</span>
                <p className="text-sm font-medium text-white/80">Quick Setup</p>
              </div>
            </div>
            
            <div className="flex flex-col sm:flex-row justify-center gap-4 sm:gap-6 mb-20">
              <Button
                variant="primary"
                size="lg"
                onClick={handleStartFreeTrial}
                className="border-2 border-green-500 bg-white text-[#4338CA] hover:bg-white/10 hover:text-white px-8 py-4 text-lg font-semibold rounded-xl shadow-lg transform transition-transform hover:scale-105"
              >
                Get Started Now for Free
              </Button>
              <Button
                variant="secondary"
                size="lg"
                onClick={handleContactUs}
                className="border-2 border-blue-300 bg-white/10 backdrop-blur-sm text-white hover:bg-white/20 px-8 py-4 text-lg font-semibold rounded-xl shadow-lg transform transition-transform hover:scale-105"
              >
                Schedule a Demo
              </Button>
            </div>
            
            {/* Trust Indicators */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-8 max-w-4xl mx-auto">
              {trustIndicators.map((indicator, index) => (
                <motion.div
                  key={index}
                  {...fadeInUp}
                  transition={{ delay: index * 0.1 }}
                  className="flex flex-col items-center bg-white/10 backdrop-blur-sm rounded-2xl p-6 md:p-8 border border-white/5 shadow-xl transform transition-transform hover:scale-105"
                >
                  <div className="mb-4 text-white/90 text-4xl">{indicator.icon}</div>
                  <h3 className="font-semibold text-xl mb-2">{indicator.title}</h3>
                  <p className="text-white/80 text-center">{indicator.description}</p>
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
          <p className="text-gray-600 text-center mb-2 max-w-2xl mx-auto">
            Choose the perfect plan for your business. All plans include core features with no hidden costs.
          </p>
          <p className="text-blue-600 text-center mb-6 max-w-2xl mx-auto text-sm font-medium">
            New per-user pricing effective March 15, 2025
          </p>
          
          {/* Billing Tabs */}
          <div className="flex justify-center mb-12">
            <div className="inline-flex rounded-md shadow-sm bg-gray-100 p-1">
              <button
                type="button"
                className={`px-6 py-2 text-sm font-medium rounded-md ${
                  !billingAnnual
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-700 hover:bg-gray-50'
                }`}
                onClick={() => setBillingAnnual(false)}
              >
                Monthly
              </button>
              <button
                type="button"
                className={`px-6 py-2 text-sm font-medium rounded-md flex items-center ${
                  billingAnnual
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-700 hover:bg-gray-50'
                }`}
                onClick={() => setBillingAnnual(true)}
              >
                Annual
                <span className="ml-2 bg-green-100 text-green-800 text-xs font-semibold px-2 py-0.5 rounded-full">
                  Save up to 25%
                </span>
              </button>
            </div>
          </div>
          
          {/* Main Pricing Cards - Show only first 3 by default */}
          <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            {pricingTiers.slice(0, 3).map((tier, index) => (
              <motion.div
                key={index}
                {...fadeInUp}
                transition={{ delay: index * 0.1 }}
              >
                <Card
                  interactive
                  elevation={tier.name === "Essentials" ? "md" : "sm"}
                  className={`h-full ${tier.name === "Essentials" ? "border-2 border-blue-600" : ""}`}
                >
                  {/* Card Header */}
                  <div className="border-b border-gray-100 pb-4 mb-4">
                    {tier.highlight && (
                      <div className="text-blue-600 text-sm font-semibold mb-2">{tier.highlight}</div>
                    )}
                    <h3 className="text-xl font-semibold mb-2">{tier.name}</h3>
                    <p className="text-gray-600">{tier.description}</p>
                  </div>
                  
                  {/* Pricing */}
                  <div className="mb-6">
                    <div className="flex items-baseline">
                      <span className="text-3xl font-bold">{billingAnnual ? tier.annualPrice : tier.price}</span>
                      {billingAnnual && tier.price !== "Free" && (
                        <span className="ml-2 text-sm text-gray-500">billed annually</span>
                      )}
                    </div>
                    {tier.annualSavings && billingAnnual && (
                      <div className="text-green-600 text-sm font-medium mt-1">{tier.annualSavings}</div>
                    )}
                    {tier.userLimit && (
                      <div className="text-gray-600 text-sm mt-2">{tier.userLimit}</div>
                    )}
                  </div>
                  
                  {/* Feature Categories */}
                  <div className="mb-6">
                    <h4 className="font-medium text-gray-900 mb-3">What's included:</h4>
                    <ul className="space-y-3">
                      {/* Show all features */}
                      {tier.features.map((feature, i) => (
                        <li key={i} className="flex items-start">
                          <FaCheckCircle className="text-green-500 mr-2 flex-shrink-0 mt-1" />
                          <span className="text-gray-700">{feature}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                  
                  {/* CTA Button */}
                  <Button
                    variant={tier.name === "Essentials" ? "primary" : "secondary"}
                    fullWidth
                    onClick={handleStartFreeTrial}
                  >
                    Get Started
                  </Button>
                </Card>
              </motion.div>
            ))}
          </div>
          
          {/* Enterprise Plans Toggle */}
          <div className="text-center mt-8">
            <button
              className="inline-flex items-center text-blue-600 hover:text-blue-800 font-medium"
              onClick={() => setShowEnterprisePlans(!showEnterprisePlans)}
            >
              {showEnterprisePlans ? 'Hide Enterprise Options' : 'See Enterprise Options'}
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className={`h-5 w-5 ml-1 transform transition-transform ${showEnterprisePlans ? 'rotate-180' : ''}`}
                viewBox="0 0 20 20"
                fill="currentColor"
              >
                <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
              </svg>
            </button>
          </div>
          
          {/* Enterprise Plans - Shown when toggled */}
          {showEnterprisePlans && (
            <div className="mt-8 grid md:grid-cols-2 gap-8 max-w-5xl mx-auto">
              {pricingTiers.slice(3).map((tier, index) => (
                <motion.div
                  key={index + 3}
                  {...fadeInUp}
                  transition={{ delay: index * 0.1 }}
                >
                  <Card
                    interactive
                    elevation="sm"
                    className="h-full"
                  >
                    {/* Card Header */}
                    <div className="border-b border-gray-100 pb-4 mb-4">
                      {tier.highlight && (
                        <div className="text-blue-600 text-sm font-semibold mb-2">{tier.highlight}</div>
                      )}
                      <h3 className="text-xl font-semibold mb-2">{tier.name}</h3>
                      <p className="text-gray-600">{tier.description}</p>
                    </div>
                    
                    {/* Pricing */}
                    <div className="mb-6">
                      <div className="flex items-baseline">
                        <span className="text-3xl font-bold">{billingAnnual ? tier.annualPrice : tier.price}</span>
                        {billingAnnual && tier.price !== "Custom Pricing" && (
                          <span className="ml-2 text-sm text-gray-500">billed annually</span>
                        )}
                      </div>
                      {tier.annualSavings && billingAnnual && (
                        <div className="text-green-600 text-sm font-medium mt-1">{tier.annualSavings}</div>
                      )}
                      {tier.userLimit && (
                        <div className="text-gray-600 text-sm mt-2">{tier.userLimit}</div>
                      )}
                    </div>
                    
                    {/* Feature Categories */}
                    <div className="mb-6">
                      <h4 className="font-medium text-gray-900 mb-3">What's included:</h4>
                      <ul className="space-y-3">
                        {/* Show all features */}
                        {tier.features.map((feature, i) => (
                          <li key={i} className="flex items-start">
                            <FaCheckCircle className="text-green-500 mr-2 flex-shrink-0 mt-1" />
                            <span className="text-gray-700">{feature}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                    
                    {/* CTA Button */}
                    <Button
                      variant="secondary"
                      fullWidth
                      onClick={tier.name === "Enterprise" ? handleContactUs : handleStartFreeTrial}
                    >
                      {tier.name === "Enterprise" ? "Contact Sales" : "Get Started"}
                    </Button>
                  </Card>
                </motion.div>
              ))}
            </div>
          )}
          
          {/* Compare All Plans Link */}
          <div className="text-center mt-4 mb-12">
            <a href="#" className="text-gray-600 hover:text-gray-900 underline text-sm">
              Compare all plans feature-by-feature
            </a>
          </div>
          
          {/* Custom Solution Box */}
          <div className="bg-blue-50 p-6 rounded-lg max-w-3xl mx-auto mb-12">
            <div className="flex flex-col md:flex-row md:items-center">
              <div className="md:flex-1">
                <h3 className="text-xl font-semibold mb-2">Need a custom solution?</h3>
                <p className="text-gray-600">
                  Our enterprise plans can be tailored to your organization's specific needs.
                </p>
              </div>
              <div className="mt-4 md:mt-0">
                <Button
                  variant="primary"
                  onClick={handleContactUs}
                  className="px-6 whitespace-nowrap"
                >
                  Contact Sales
                </Button>
              </div>
            </div>
          </div>
          
          {/* FAQ Section - Simplified */}
          <div className="max-w-4xl mx-auto">
            <h3 className="text-xl font-semibold text-center mb-6">Frequently Asked Questions</h3>
            <div className="grid md:grid-cols-2 gap-6">
              <div className="bg-gray-50 p-5 rounded-lg">
                <h4 className="font-semibold mb-2">Can I change plans later?</h4>
                <p className="text-gray-600">Yes, you can upgrade or downgrade your plan at any time. Changes take effect on your next billing cycle.</p>
              </div>
              <div className="bg-gray-50 p-5 rounded-lg">
                <h4 className="font-semibold mb-2">How does the annual billing work?</h4>
                <p className="text-gray-600">Annual billing is charged once per year and provides up to 25% discount compared to monthly billing, varying by plan.</p>
              </div>
              <div className="bg-gray-50 p-5 rounded-lg">
                <h4 className="font-semibold mb-2">What happens if I exceed my user limit?</h4>
                <p className="text-gray-600">We'll notify you when you're approaching your limit. You can upgrade to the next tier or contact us for custom pricing.</p>
              </div>
              <div className="bg-gray-50 p-5 rounded-lg">
                <h4 className="font-semibold mb-2">Is there a free trial available?</h4>
                <p className="text-gray-600">Yes, all paid plans include a 14-day free trial so you can test all features before committing.</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Industry Solutions Section */}
      <section className="py-24 bg-gradient-to-b from-white to-gray-50">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <span className="inline-block px-4 py-1 bg-blue-50 text-blue-600 rounded-full text-sm font-semibold mb-4">INDUSTRY SOLUTIONS</span>
            <h2 className="text-4xl font-bold mb-6 bg-gradient-to-r from-blue-600 to-indigo-800 bg-clip-text text-transparent">
              Tailored For Every Industry
            </h2>
            <p className="text-gray-600 text-lg max-w-2xl mx-auto">
              See how businesses across different industries leverage ClockFlow to optimize their operations and increase productivity.
            </p>
          </div>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8 lg:gap-10 max-w-7xl mx-auto">
            {useCases.map((useCase, index) => (
              <motion.div
                key={index}
                {...fadeInUp}
                transition={{ delay: index * 0.1 }}
                className="flex"
              >
                <Card
                  interactive
                  elevation="sm"
                  className="h-full w-full hover:border-blue-200 transform transition-all duration-300 hover:-translate-y-2 hover:shadow-xl"
                >
                  <div className="bg-blue-50 inline-flex p-4 rounded-2xl mb-6">
                    <div className="text-blue-600 transform transition-transform duration-300 hover:scale-110">
                      {useCase.icon}
                    </div>
                  </div>
                  
                  <h3 className="text-2xl font-bold mb-3 text-gray-800">{useCase.industry}</h3>
                  <p className="text-gray-600 mb-6 text-lg">{useCase.description}</p>
                  
                  <div className="border-t border-gray-100 pt-6 mt-auto">
                    <h4 className="font-medium text-gray-800 mb-4">Key Benefits:</h4>
                    <ul className="space-y-3">
                      {useCase.benefits.map((benefit, i) => (
                        <li key={i} className="flex items-start">
                          <FaCheckCircle className="text-green-500 mr-3 flex-shrink-0 mt-1" />
                          <span className="text-gray-700">{benefit}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                  
                  <div className="mt-8 pt-4 border-t border-gray-100">
                    <button className="text-blue-600 font-medium hover:text-blue-800 inline-flex items-center group">
                      Learn more about {useCase.industry} solutions
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 ml-2 transform transition-transform group-hover:translate-x-1" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M10.293 5.293a1 1 0 011.414 0l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414-1.414L12.586 11H5a1 1 0 110-2h7.586l-2.293-2.293a1 1 0 010-1.414z" clipRule="evenodd" />
                      </svg>
                    </button>
                  </div>
                </Card>
              </motion.div>
            ))}
          </div>
          
          <div className="text-center mt-16">
            <Button
              variant="secondary"
              size="lg"
              onClick={handleContactUs}
              className="bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200 px-8 py-3 rounded-xl font-medium inline-flex items-center"
            >
              <span>Explore all industry solutions</span>
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 ml-2" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10.293 5.293a1 1 0 011.414 0l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414-1.414L12.586 11H5a1 1 0 110-2h7.586l-2.293-2.293a1 1 0 010-1.414z" clipRule="evenodd" />
              </svg>
            </Button>
          </div>
        </div>
      </section>

      {/* Upcoming Features Section */}
      <section className="bg-gray-50 py-20">
        <div className="container mx-auto px-4">
          <h2 className="text-3xl font-bold text-center mb-4">Coming Soon: Features in Development</h2>
          <p className="text-gray-600 text-center mb-12 max-w-2xl mx-auto">
            We're constantly improving ClockFlow. Here's a preview of exciting features we're currently developing for future releases.
          </p>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {upcomingFeatures.map((feature, index) => (
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
                        <FaCheckCircle className="text-blue-400 mr-2 flex-shrink-0" />
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

      {/* Call to Action */}
      <section className="bg-gradient-to-br from-[#4338CA] to-[#5850EC] text-white py-24 md:py-32 overflow-hidden relative">
        {/* Background pattern */}
        <div className="absolute inset-0 opacity-10">
          <svg className="w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
            <defs>
              <pattern id="grid-cta" width="8" height="8" patternUnits="userSpaceOnUse">
                <path d="M 8 0 L 0 0 0 8" fill="none" stroke="white" strokeWidth="0.5" />
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#grid-cta)" />
          </svg>
        </div>
        
        <div className="container mx-auto px-4 text-center relative z-10">
          <motion.div
            {...fadeInUp}
            className="max-w-4xl mx-auto"
          >
            <span className="inline-block px-6 py-2 bg-white/10 backdrop-blur-sm rounded-full text-white/90 font-medium mb-8">
              Join 10,000+ businesses already using ClockFlow
            </span>
            
            <h2 className="text-4xl md:text-5xl text-white font-bold mb-8 leading-tight">
              Ready to Transform Your <span className="text-transparent bg-clip-text bg-gradient-to-r from-green-300 to-blue-300">Workforce Management?</span>
            </h2>
            
            <p className="text-xl text-white/90 mb-12 max-w-3xl mx-auto leading-relaxed">
              Start streamlining your time tracking, simplifying payroll, and boosting team productivity today with our powerful platform.
            </p>
            
            <div className="flex flex-col sm:flex-row justify-center gap-4 sm:gap-6 mb-8">
              <Button
                variant="primary"
                size="lg"
                onClick={handleStartFreeTrial}
                className="border-2 border-green-500 bg-white text-[#4338CA] hover:bg-white/10 hover:text-white px-8 py-4 text-lg font-semibold rounded-xl shadow-lg transform transition-transform hover:scale-105"
              >
                Get Started Now
              </Button>
              <Button
                variant="secondary"
                size="lg"
                onClick={handleContactUs}
                className="border-2 border-blue-300 bg-white/10 backdrop-blur-sm text-white hover:bg-white/20 px-8 py-4 text-lg font-semibold rounded-xl shadow-lg transform transition-transform hover:scale-105"
              >
                Book a Demo
              </Button>
            </div>
            
            <p className="text-white/70 text-sm mt-8">
              No credit card required for free tier • 14-day trial on all paid plans • Cancel anytime
            </p>
          </motion.div>
        </div>
      </section>
    </div>
  );
};

export default Overview;