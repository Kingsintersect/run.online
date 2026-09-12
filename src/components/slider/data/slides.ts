export interface SlideData {
  id: number
  title: string
  subtitle: string
  description: string
  image: string
  category: string
  primaryAction: {
    text: string
    icon: string
    url?: string
  }
  secondaryAction: {
    text: string
    icon: string
    url?: string
  }
}

export const slidesData: SlideData[] = [
  {
    id: 1,
    title: "Future Leaders",
    subtitle: "Shape Tomorrow, Today",
    description:
      "Join a community of innovators and changemakers. Access world-class education, cutting-edge research opportunities, and connect with peers who share your ambition.",
    image: "/slides/s1.jpg",
    category: "Academic Excellence",
    primaryAction: { text: "Explore Programs", icon: "▶", url: "/academics" },
    secondaryAction: { text: "Learn More", icon: "ℹ", url: "/auth/signup" },
  },
  {
    id: 2,
    title: "Breakthrough",
    subtitle: "Science That Matters",
    description:
      "Engage in groundbreaking research across multiple disciplines. Work alongside renowned faculty and contribute to discoveries that impact the world.",
    image: "/slides/s2.jpg",
    category: "Research & Innovation",
    primaryAction: { text: "Research Centers", icon: "🔬", url: "/research" },
    secondaryAction: { text: "Join Teams", icon: "👥", url: "/auth/signup" },
  },
  // {
  //     id: 3,
  //     title: "Experience",
  //     subtitle: "Beyond the Classroom",
  //     description: "Immerse yourself in a vibrant campus community. From sports to arts, entrepreneurship to volunteer work - discover your passion and build lifelong connections.",
  //     image: "/slides/s3.jpg",
  //     category: "Student Life",
  //     primaryAction: { text: "Campus Events", icon: "📅", url: "programs" },
  //     secondaryAction: { text: "Collaborative Learning", icon: "🏠", url: "/auth/signup" }
  // },
  {
    id: 3,
    title: "Your Success",
    subtitle: "Career Ready Graduates",
    description:
      "Launch your career with confidence. Access internships, mentorship programs, and career services that connect you with leading employers worldwide.",
    image: "/slides/s4.jpg",
    category: "Career Development",
    primaryAction: { text: "Career Boost", icon: "💼", url: "/academics" },
    secondaryAction: {
      text: "Alumni Network",
      icon: "🤝",
      url: "/auth/signup",
    },
  },
  {
    id: 5,
    title: "Opportunity Awaits",
    subtitle: "Scholarships & Financial Aid",
    description:
      "Make your education affordable. Explore a wide range of scholarships, grants, and financial aid options tailored to support your academic journey.",
    image: "/slides/s5.jpg",
    category: "Financial Support",
    primaryAction: {
      text: "View Scholarships",
      icon: "🎓",
      url: "/admissions",
    },
    secondaryAction: { text: "Apply Now", icon: "📝", url: "/auth/signup" },
  },
  // {
  //     id: 6,
  //     title: "Global Reach",
  //     subtitle: "International Opportunities",
  //     description: "Expand your horizons with study abroad programs, international partnerships, and exchange opportunities. Connect with students worldwide and gain global perspective.",
  //     image: "/slides/s6.jpg",
  //     category: "Global Education",
  //     primaryAction: { text: "Study Abroad", icon: "🌍", url: "programs" },
  //     secondaryAction: { text: "Exchange Programs", icon: "✈️", url: "/auth/signup" }
  // },
  // {
  //     id: 6,
  //     title: "Our Planet",
  //     subtitle: "Sustainability & Innovation",
  //     description: "Be part of the solution. Join initiatives focused on environmental sustainability, green technology, and creating a better future for generations to come.",
  //     image: "/slides/s7.jpg",
  //     category: "Sustainability",
  //     primaryAction: { text: "Green Initiatives", icon: "🌱", url: "programs" },
  //     secondaryAction: { text: "Get Involved", icon: "♻️", url: "/auth/signup" }
  // },
  {
    id: 7,
    title: "Unity & Diversity",
    subtitle: "Inclusive Community",
    description:
      "Celebrate differences and build connections. Our diverse community welcomes students from all backgrounds, fostering an inclusive environment where everyone thrives.",
    image: "/slides/s8.jpg",
    category: "Community",
    primaryAction: { text: "Community Groups", icon: "👫", url: "programs" },
    secondaryAction: { text: "Join Us", icon: "💝", url: "/auth/signup" },
  },
]
