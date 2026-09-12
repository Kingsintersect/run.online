export const SUPPORT_EMAIL = "support.odl@school.edu.ng"
export const SUPPORT_PHONE = "+2347044914032"
export const UNIVERSITY_NAME = "Redeemer's University"
export const UNIVERSITY_LOGO_URL = "/logo/logo.jpg"
export const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL + "/api/v1" ||
  "http://localhost:3031/api/v1"

export const ADMISSION_PORTAL_URL = "https://admission.run.edu.ng"
export const PAYMENT_GATEWAY_URL = "https://payments.run.edu.ng"

export const SOCIAL_MEDIA_LINKS = {
  facebook: "https://www.facebook.com/run",
  twitter: "https://twitter.com/run",
  instagram: "https://www.instagram.com/run",
  linkedin: "https://www.linkedin.com/school/run",
}
export const CONTACT_INFO = {
  address: "Redeemer's University, Ede, Osun State, Nigeria",
  email: SUPPORT_EMAIL,
  phone: SUPPORT_PHONE,
}

export const OUR_PROGRAMS = {
  "Distance Learning Programs": true,
  "Undergraduate Programs": false,
  "Postgraduate Programs": true,
  "Business School Programs": false,
  "Professional Courses": false,
  "Certificate Programs": true,
  "Diploma Programs": false,
  "Online Courses": false,
}

// FEE AMOUNTS (could also be fetched from API in real implementation)
export const APPLICATION_FEE_AMOUNT = 10000
export const ACCEPTANCE_FEE_AMOUNT = 30000
export const TUITION_FEE_AMOUNT = 195000

// SITE RELATED INFORMATION
export const SITE_NAME = "Redeemer's University Portal"
export const SITE_DESCRIPTION =
  "Your gateway to academic excellence and seamless university services at Redeemer's University."
export const SITE_KEYWORDS =
  "Redeemer's University, student portal, academic services, financial services, course registration, results, admission, fees payment"
export const SITE_URL = "https://run.online.qverselearning.org"
export const SITE_LOGO_URL = "/logo/logo.jpg"
