

# Rebranding Plan: KUET Tuition → FindMyTeacher

## Overview
Rebrand the platform to "FindMyTeacher" with messaging emphasizing **online-only learning** that brings quality education to **remote villages and underserved areas** across Bangladesh.

---

## Files to Update

### 1. **index.html** – Meta tags & title
- Change title from "kuet tution" to "FindMyTeacher"
- Update description: "Quality online tutoring for every student, everywhere"
- Update OG/Twitter meta tags

### 2. **src/components/Navbar.tsx**
- Line 68: `KUET Tuition` → `FindMyTeacher`
- Update branding text

### 3. **src/components/HeroSection.tsx**
- Badge: "Exclusive for KUET Students" → "Learn From Anywhere"
- Headline: Update to emphasize online learning accessibility
- Description: Highlight that remote village students can now access quality tutors online
- Trust indicators: "KUET Exclusive" → "100% Online"

### 4. **src/components/Footer.tsx**
- "KUET Tuition Ecosystem" → "FindMyTeacher"
- Copyright: Update tagline to emphasize online education reach

### 5. **src/components/FeaturesSection.tsx**
- Update "verified by KUET administration" → "verified by our team"
- "Filter by subject, budget, location" → "Filter by subject, budget, and availability"
- Update section description to emphasize online accessibility

### 6. **src/pages/About.tsx**
- Rewrite mission: Online platform bringing verified tutors to students everywhere
- Update "Why KUET Tuition?" → "Why FindMyTeacher?"
- Emphasize: "No matter where you live—city or village—quality education is just a click away"

### 7. **src/pages/FAQ.tsx**
- Update intro text
- Update FAQ answers to remove KUET-specific references
- Add context about online-only tutoring

### 8. **src/pages/HowItWorks.tsx**
- Step descriptions: Remove "KUET" references
- Update to emphasize online sessions

### 9. **src/pages/Login.tsx**
- Line 93: "Welcome to KUET Tuition Ecosystem" → "Welcome to FindMyTeacher"
- Line 112: "KUET Tuition" → "FindMyTeacher"
- Update welcome text to mention online learning

### 10. **src/pages/TermsOfService.tsx**
- Replace all "KUET Tuition Ecosystem" → "FindMyTeacher"
- Update platform description

### 11. **src/pages/PrivacyPolicy.tsx**
- Update references to KUET
- Update verification language

### 12. **src/pages/AdminDashboard.tsx**
- Line 313: "Manage the KUET Tuition Ecosystem" → "Manage FindMyTeacher"

### 13. **src/pages/Messages.tsx**
- Contract text: "KUET Tuition Ecosystem" → "FindMyTeacher"

### 14. **src/components/ContractModal.tsx**
- Update any platform references in displayed text

---

## Key Messaging Changes

| Old | New |
|-----|-----|
| KUET Tuition Ecosystem | FindMyTeacher |
| Exclusive for KUET Students | Learn From Anywhere |
| KUET administration verified | Platform verified |
| Khulna area focus | All of Bangladesh, including remote villages |
| Local tutoring | 100% Online tutoring |
| Filter by location | Filter by availability |

---

## New Taglines

- **Hero**: "Quality Education Knows No Distance"
- **Subtext**: "Whether you're in Dhaka or a remote village, connect with verified tutors and learn online. Education for everyone, everywhere."
- **Footer**: "Bringing quality education to every corner of Bangladesh"

---

## Implementation Summary

**13 files** to update with consistent branding:
- 3 components (Navbar, Footer, HeroSection, FeaturesSection)
- 9 pages (Login, About, FAQ, HowItWorks, TermsOfService, PrivacyPolicy, AdminDashboard, Messages)
- 1 config (index.html)

All changes are text/content updates—no logic or database changes required.

