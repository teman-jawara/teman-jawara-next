# PRODUCT REQUIREMENTS DOCUMENT (PRD)

## TemanJawara MVP — Next.js Rebuild

**Version:** 1.1  
**Status:** Approved Baseline  
**Target Timeline:** 2 weeks  
**Target Audience:** Mahasiswa Universitas Sultan Ageng Tirtayasa (UNTIRTA)

---

## 1. Product Overview

TemanJawara is a collaboration platform specifically for Universitas Sultan Ageng Tirtayasa (UNTIRTA) students to find suitable teammates, discover competition opportunities, and build competition teams based on skills, interests, and academic background.

The MVP is focused ONLY on active UNTIRTA students.

The core purpose is to help UNTIRTA students find suitable teammates for competitions through a centralized platform instead of relying only on fragmented group chats and personal networks.

---

## 2. Problem Statement

UNTIRTA students often have difficulty finding reliable teammates for competitions because:

- Their existing network is limited.
- Competition information is fragmented across group chats and social media.
- Students have difficulty identifying people with complementary skills.
- There is no centralized collaboration platform specifically focused on UNTIRTA students.

---

## 3. Product Goals

The MVP should allow UNTIRTA students to:

1. Create secure accounts.
2. Create an UNTIRTA-oriented profile.
3. Discover competition-related posts.
4. Search and filter competition opportunities.
5. Like, comment, and save posts.
6. View other student profiles.
7. Send and manage lightweight connection requests.
8. Receive simple notifications.
9. Get basic relevant post recommendations using TF-IDF and cosine similarity.

---

## 4. Target Users

### User Type 1 — Student Looking for Teammates
Students who need teammates for competitions.

### User Type 2 — Student With Specific Skills
Students who want to contribute their skills to competition teams.

### User Type 3 — Student Exploring Competitions
Students looking for competition opportunities and potential teammates.

### Platform Scope

The MVP is ONLY for:

**Mahasiswa Universitas Sultan Ageng Tirtayasa (UNTIRTA).**

Support for students from other universities is OUT OF SCOPE.

---

# 5. MVP Scope

## 5.1 Landing Page

Create a public UNTIRTA-focused landing page explaining:

- What TemanJawara is.
- Who it is for.
- How students can use it.
- CTA to register/login.

---

## 5.2 Authentication

Use Supabase Auth with:

- Register
- Login
- Logout
- Session management
- Protected application routes

The registration process should create the corresponding profile record.

NIM should preferably be completed as part of profile completion rather than making the initial registration unnecessarily complex.

UNTIRTA email-domain restriction may be implemented ONLY if the official domain and verification flow are confirmed.

Do NOT invent or hardcode an unverified UNTIRTA email domain.

The MVP must remain functional without this restriction if the official verification mechanism is not confirmed.

---

## 5.3 Student Profile

Profile fields:

- Full name
- NIM
- Faculty
- Study program
- Generation/year
- Profile picture
- Bio
- Skills
- Competition interests
- Contact email
- WhatsApp
- Instagram
- Contact-sharing preferences

Privacy:

- NIM should NOT be public by default.
- Contact information should only be visible according to the user's sharing preferences.
- Faculty, study program, and generation may be publicly visible.

Profile functionality:

- View own profile
- Edit own profile
- View other student profiles

---

# 6. Competition Posts

Students can create competition-related posts.

Required fields:

- Title
- Description
- Competition category
- Required skills

Optional fields:

- Competition/event name
- Deadline
- Number of teammates needed
- Faculty/study-program preference
- Image

Example categories:

- Hackathon
- UI/UX
- Business
- Design
- Poster
- Programming
- Data/AI
- Scientific Writing
- PKM
- Debate/Public Speaking
- Other

Post functionality:

- Create
- View
- Edit own post
- Delete own post

---

# 7. Feed

The feed should display competition posts from UNTIRTA students.

Users should be able to:

- Browse posts
- Open post details
- View post author
- View required skills
- View competition information
- Like
- Comment
- Save

The UI should be responsive and mobile-first.

---

# 8. Like

Users can:

- Like a post
- Unlike a post
- See like count

A user must not be able to create duplicate likes for the same post.

---

# 9. Comment

Users can:

- Add comments
- View comments
- Delete their own comments

Comments are non-nested for the MVP.

---

# 10. Save Post

Users can:

- Save a post
- Unsave a post
- View their saved posts

Create a dedicated Saved page.

---

# 11. Search and Filter

Users can search competition posts by:

- Title
- Description

Users can filter by:

- Competition category
- Required skills

The search/filter functionality should remain simple and suitable for the MVP.

---

# 12. Connection System

Instead of real-time chat, the MVP uses lightweight connection requests.

Users can:

- Send connection request
- Accept request
- Reject request
- View pending requests
- View accepted connections

Connection statuses:

- pending
- accepted
- rejected

Rules:

- Users cannot connect with themselves.
- Duplicate active pending requests should be prevented.
- Connection requests involve sender and receiver.
- Contact information is shared according to privacy preferences.

Real-time chat is OUT OF SCOPE.

---

# 13. Notifications

Notifications are database-backed and NOT real-time.

Notification types:

- Connection request received
- Connection request accepted
- Someone liked your post
- Someone commented on your post

Notifications should support:

- Read/unread status
- Created timestamp

---

# 14. Recommendation System

The MVP uses a lightweight content-based recommendation system using:

- TF-IDF
- Cosine similarity

No external AI API or external ML service should be required.

### User recommendation inputs

Use primarily:

- Skills
- Competition interests
- Faculty
- Study program
- Bio

### Post recommendation inputs

Use:

- Title
- Description
- Competition category
- Required skills
- Competition/event name

### Preprocessing

Basic preprocessing:

- Lowercase text
- Tokenization
- Lightweight stopword handling
- Normalize array-based fields

### Recommendation behavior

- Calculate similarity between user profile and competition posts.
- Return approximately the top 5–10 relevant posts.
- Use content-based recommendation only.
- Provide a fallback to recent/newest posts when similarity data is sparse or the user has limited profile information.

Generation/year should be treated primarily as metadata/filter information, NOT as a major TF-IDF signal.

The recommendation system should remain lightweight and suitable for the MVP dataset.

---

# 15. Database

Use Supabase PostgreSQL.

Main tables:

1. `profiles`
2. `posts`
3. `likes`
4. `comments`
5. `saved_posts`
6. `connections`
7. `notifications`

Use UUIDs where appropriate.

All user-owned records should be linked to Supabase Auth users.

---

## 15.1 Profiles

Fields should include:

- id
- full_name
- nim
- faculty
- study_program
- generation
- profile_picture_url
- bio
- skills
- competition_interests
- contact_email
- whatsapp
- instagram
- share_contact_email
- share_contact_whatsapp
- share_contact_instagram
- created_at
- updated_at

---

## 15.2 Posts

Fields:

- id
- user_id
- title
- description
- competition_category
- required_skills
- competition_event_name
- deadline
- number_of_teammates_needed
- faculty_or_prodi_preference
- image_url
- created_at
- updated_at

---

## 15.3 Likes

Fields:

- user_id
- post_id
- created_at

Constraint:

- Unique `(user_id, post_id)`

---

## 15.4 Saved Posts

Fields:

- user_id
- post_id
- created_at

Constraint:

- Unique `(user_id, post_id)`

---

## 15.5 Comments

Fields:

- id
- user_id
- post_id
- content
- created_at
- updated_at

---

## 15.6 Connections

Fields:

- id
- sender_id
- receiver_id
- status
- created_at
- updated_at

Rules:

- No self-connection.
- Prevent duplicate active pending requests.

---

## 15.7 Notifications

Fields:

- id
- recipient_id
- type
- actor_id
- post_id
- connection_id
- read
- created_at

---

# 16. Row Level Security

Supabase Row Level Security must be enabled for relevant tables.

Policies should ensure:

- Users can manage their own profiles.
- Users can only edit/delete their own posts.
- Users can delete their own comments.
- Users can manage their own likes.
- Users can manage their own saved posts.
- Connection participants can access relevant connection data.
- Notification recipients can access their own notifications.
- Private profile/contact information follows privacy rules.
- Unauthorized users cannot modify another user's resources.

Never expose the Supabase service-role key to the client.

---

# 17. Technical Architecture

Technology stack:

- Next.js
- App Router
- TypeScript
- Tailwind CSS
- Supabase Auth
- Supabase PostgreSQL
- Supabase Storage
- Vercel
- GitHub

Recommended project structure:

```text
/app
  /(auth)
    /login
    /register
  /(app)
    /feed
    /posts/create
    /posts/[id]/edit
    /profile/[id]
    /me
    /saved
    /notifications
    /connections

/components
  /ui
  /layout
  /posts
  /profile
  /connections
  /notifications
  /recommendations

/lib
  /supabase
  /utils
  /recommender

/types
/actions
/hooks
/constants