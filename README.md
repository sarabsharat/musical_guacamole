# 🥑 musical_guacamole 🥑

Welcome to our project! We are building a robust, secure, and multi-tenant restaurant management system with a focus on compliance and efficiency.

---

## ✨ Project Overview

This project is an **Enterprise B2B SaaS** platform designed for the Jordanian culinary market. We ensure that every restaurant (tenant) has total data isolation and security, backed by a modern, brutalist aesthetic.

## 🛠 Tech Stack

* **Framework**: Next.js 16 (App Router)
* **Language**: TypeScript
* **ORM/Database**: Prisma + PostgreSQL
* **Styling**: Tailwind CSS
* **Infrastructure**: Turbopack & Edge Runtime

## 🛡 Security Architecture

* **Layer 1 (Middleware):** Acts as a high-speed middleware, resolving tenant subdomains and injecting secure headers.
* **Layer 2 (Root Layout):** Resolves the tenant context using a centralized Resolver pattern.
* **Layer 3 (Guardrails):** Enforces strict identity, role, and tenant-match checks on every request.



## 🚀 Getting Started

1. **Clone the repository**
2. **Install dependencies**:
```bash
npm install

```


3. **Run the development server**:
```bash
npm run dev

```



---

## 💖 Credits & Tools

* **Sara**: Tech Lead
* **Rima**: General Manager
---

*Built with love for culinary excellence! 🥘*