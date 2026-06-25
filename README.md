# CSE Connect

I built **CSE Connect** as a full-stack, real-time communication portal for Computer Science departments. It acts as a secure broadcast channel connecting professors and students, completely locked down to official university email addresses.

## Things I Learned & Engineering Challenges I Solved

### 1. The Real-Time Engine: Why I Chose WebSockets over HTTP
When I first started thinking about the chat feature, I realized that standard HTTP requests work on a "Pull" system. If I used `fetch` or `axios` for the chat, my React frontend would have to explicitly ask the Node server every single second: *"Hey, are there new messages?"* This is called Long Polling. If 400 MNNIT students were all hit the server at the exact same time just to check for updates, it would instantly exhaust server resources and crash.

To solve this, I used **WebSockets (`Socket.io`)** to build an open, two-way pipe between the browser and the server. It operates as a "Push" system. The second a professor types a broadcast message and hits enter, the server instantly pushes that data down the pipe to all connected student screens without them ever having to ask for it.

### 2. The Identity Crisis: Why a Lock on the Front Door is Mandatory
At one point, I wanted to remove the login screen entirely to make the app faster to access, but I ran into three massive roadblocks that completely changed my approach:
* **The Identity Crisis:** My entire application flow relies on role-based routing. Without authentication, the app has no way to separate views dynamically based on whether the user is a Professor (who needs the broadcast layout) or a Student (who needs a read-only feed).
* **Zero Accountability:** In an anonymous chat room, anyone could type anything or impersonate a faculty member. Managing a chat space of 400 unauthenticated students would instantly turn chaotic.
* **Privacy Leaks:** Without a lock on the front door, official professor announcements, schedules, and internal department updates would be exposed to the public internet instead of being safely secured within our specific branch.

**The Solution:** I engineered a strict domain-locked authentication layer using Google OAuth 2.0. The backend intercepts the token payload, verifies that the email ends with `@mnnit.ac.in`, and safely routes the user based on their validated profile.

### 3. Architecture of my API Pipeline
Through building this project, I established a clean, standardized architectural pattern for handling asynchronous data operations. Every single time my server intercepts a non-socket request, it executes this strict transactional lifecycle to ensure database integrity and accurate state changes:

`Catch Data ➔ Validate Payload ➔ Execute Database Action ➔ Send Receipt`

---

## App Architecture & Features

* **Strict Domain Lockdown:** Secure Google OAuth integration rejecting any email outside the official university domain.
* **Role-Based Access Control (RBAC):** Professors unlock full broadcasting inputs, while students get a clean, distraction-free read-only interface to eliminate spam.
* **Database Hydration:** Connected a MongoDB Atlas cluster to the socket architecture. On room mount, the app automatically pulls the sorted historical logs so old announcements are never lost on page refresh.
* **Sleek, Responsive UI:** Mobile-first user experience styled entirely with Tailwind CSS.

## Tech Stack I Used

* **Frontend:** React, Tailwind CSS, Vite
* **Backend:** Node.js, Express.js
* **Database:** MongoDB Atlas, Mongoose ODM
* **Real-Time Pipeline:** Socket.io
* **Authentication:** Google Auth Library (`@react-oauth/google`)

## License

This project is open-source and available under the MIT License.
