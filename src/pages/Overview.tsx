import React from 'react';
import { Link } from 'react-router-dom';
import { 
  Clock, 
  Calendar, 
  BarChart2, 
  Users, 
  MapPin, 
  FileText,
  CheckCircle,
  Shield,
  Smartphone,
  DollarSign,
  Zap,
  Clock4
} from 'lucide-react';

export default function Overview() {
  const features = [
    {
      icon: Clock,
      title: 'Smart Time Tracking',
      description: 'Effortlessly track work hours with intelligent clock-in/out, break management, and overtime calculations'
    },
    {
      icon: Calendar,
      title: 'Comprehensive PTO Management',
      description: 'Automated vacation and sick leave tracking with smart accrual based on years of service'
    },
    {
      icon: BarChart2,
      title: 'Advanced Analytics & Reports',
      description: 'Real-time dashboards and detailed reports for costs, productivity, and workforce insights'
    },
    {
      icon: Users,
      title: 'Team Management',
      description: 'Role-based access control, department organization, and employee performance tracking'
    },
    {
      icon: MapPin,
      title: 'Job Location Management',
      description: 'Efficient job site organization, multi-location support, and streamlined site assignments'
    },
    {
      icon: FileText,
      title: 'Digital Timesheets & Approvals',
      description: 'Automated timesheet generation with multi-level approval workflow and audit trails'
    }
  ];

  const benefits = [
    {
      icon: CheckCircle,
      title: 'Boost Productivity',
      description: 'Save up to 5 hours per week on administrative tasks with automated time tracking and reporting'
    },
    {
      icon: Shield,
      title: 'Ensure Compliance',
      description: 'Stay compliant with labor laws through accurate time records and built-in overtime rules'
    },
    {
      icon: DollarSign,
      title: 'Reduce Costs',
      description: 'Cut payroll processing time by 80% and eliminate time theft with precise tracking'
    },
    {
      icon: Zap,
      title: 'Real-time Insights',
      description: 'Make data-driven decisions with instant access to workforce analytics and trends'
    },
    {
      icon: Smartphone,
      title: 'Work Anywhere',
      description: 'Access from any device with our responsive web app and mobile-friendly interface'
    },
    {
      icon: Clock4,
      title: 'Quick Setup',
      description: 'Get started in minutes with our intuitive interface and guided onboarding process'
    }
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Hero Section */}
      <div className="bg-white">
        <div className="max-w-7xl mx-auto py-16 px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <div className="flex justify-center mb-8">
              <img 
                src="/clockflow_logo.svg" 
                alt="ClockFlow" 
                className="h-20 w-20 object-contain"
              />
            </div>
            <h1 className="text-4xl font-extrabold text-gray-900 sm:text-5xl md:text-6xl">
              Simplify Your <span className="text-blue-600">Workforce Management</span>
            </h1>
            <p className="mt-3 max-w-md mx-auto text-base text-gray-500 sm:text-lg md:mt-5 md:text-xl md:max-w-3xl">
              The all-in-one solution for time tracking, PTO management, and workforce analytics. Trusted by over 1,000+ companies worldwide.
            </p>
            <div className="mt-5 max-w-md mx-auto sm:flex sm:justify-center md:mt-8">
              <div className="rounded-md shadow">
                <Link
                  to="/login"
                  className="w-full flex items-center justify-center px-8 py-3 border border-transparent text-base font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 md:py-4 md:text-lg md:px-10"
                >
                  Get Started
                </Link>
              </div>
              <div className="mt-3 rounded-md shadow sm:mt-0 sm:ml-3">
                <Link
                  to="/signup"
                  className="w-full flex items-center justify-center px-8 py-3 border border-transparent text-base font-medium rounded-md text-blue-600 bg-white hover:bg-gray-50 md:py-4 md:text-lg md:px-10"
                >
                  Sign Up
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Features Section */}
      <div className="py-12 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h2 className="text-3xl font-extrabold text-gray-900">
              Powerful Features
            </h2>
            <p className="mt-4 text-lg text-gray-500">
              Everything you need to manage your workforce effectively
            </p>
          </div>

          <div className="mt-10">
            <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-3">
              {features.map((feature, index) => {
                const Icon = feature.icon;
                return (
                  <div key={index} className="pt-6">
                    <div className="flow-root bg-white rounded-lg px-6 pb-8">
                      <div className="-mt-6">
                        <div>
                          <span className="inline-flex items-center justify-center p-3 bg-blue-500 rounded-md shadow-lg">
                            <Icon className="h-6 w-6 text-white" aria-hidden="true" />
                          </span>
                        </div>
                        <h3 className="mt-8 text-lg font-medium text-gray-900 tracking-tight">
                          {feature.title}
                        </h3>
                        <p className="mt-5 text-base text-gray-500">
                          {feature.description}
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Benefits Section */}
      <div className="bg-white py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h2 className="text-3xl font-extrabold text-gray-900">
              Why Choose ClockFlow?
            </h2>
          </div>
          <div className="mt-10">
            <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-3">
              {benefits.map((benefit, index) => {
                const Icon = benefit.icon;
                return (
                  <div key={index} className="flex flex-col items-center">
                    <div className="flex items-center justify-center h-12 w-12 rounded-md bg-blue-500 text-white">
                      <Icon className="h-6 w-6" aria-hidden="true" />
                    </div>
                    <h3 className="mt-6 text-lg font-medium text-gray-900">
                      {benefit.title}
                    </h3>
                    <p className="mt-2 text-base text-center text-gray-500">
                      {benefit.description}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Social Proof Section */}
      <div className="bg-gray-50 py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h2 className="text-3xl font-extrabold text-gray-900">
              Trusted by Industry Leaders
            </h2>
            <p className="mt-4 text-lg text-gray-500">
              Join thousands of companies that have transformed their workforce management
            </p>
          </div>
          <div className="mt-10">
            <div className="grid grid-cols-2 gap-8 md:grid-cols-4">
              <div className="col-span-1 flex justify-center items-center">
                <div className="text-center">
                  <div className="text-4xl font-bold text-blue-600">99%</div>
                  <div className="text-sm text-gray-500">Customer Satisfaction</div>
                </div>
              </div>
              <div className="col-span-1 flex justify-center items-center">
                <div className="text-center">
                  <div className="text-4xl font-bold text-blue-600">50K+</div>
                  <div className="text-sm text-gray-500">Active Users</div>
                </div>
              </div>
              <div className="col-span-1 flex justify-center items-center">
                <div className="text-center">
                  <div className="text-4xl font-bold text-blue-600">30%</div>
                  <div className="text-sm text-gray-500">Cost Reduction</div>
                </div>
              </div>
              <div className="col-span-1 flex justify-center items-center">
                <div className="text-center">
                  <div className="text-4xl font-bold text-blue-600">24/7</div>
                  <div className="text-sm text-gray-500">Support</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* CTA Section */}
      <div className="bg-blue-600">
        <div className="max-w-2xl mx-auto text-center py-16 px-4 sm:py-20 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-extrabold text-white sm:text-4xl">
            <span className="block">Transform Your Workforce Management</span>
            <span className="block">Start Your 30-Day Free Trial</span>
          </h2>
          <p className="mt-4 text-lg leading-6 text-blue-100">
            No credit card required. Full access to all features. Cancel anytime.
          </p>
          <Link
            to="/signup"
            className="mt-8 w-full inline-flex items-center justify-center px-5 py-3 border border-transparent text-base font-medium rounded-md text-blue-600 bg-white hover:bg-blue-50 sm:w-auto"
          >
            Sign up for free
          </Link>
        </div>
      </div>
    </div>
  );
}