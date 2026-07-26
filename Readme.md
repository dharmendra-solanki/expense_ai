# 💰 Expense AI

An AI-powered personal finance management application that helps users track expenses, manage budgets, analyze spending habits, and receive AI-driven financial insights.

---

## 🚀 Features

### 📊 Dashboard

* Overview of income, expenses, savings, and balance
* Interactive charts and analytics
* Recent transaction history
* Financial summary cards

### 💸 Expense Management

* Add, edit, and delete expenses
* Categorize expenses
* Filter by date and category
* Search transactions

### 💵 Income Management

* Record multiple income sources
* Track monthly earnings
* Income history

### 🎯 Budget Planning

* Create monthly budgets
* Category-wise spending limits
* Budget utilization tracking
* Overspending alerts

### 🏦 Savings Goals

* Create savings targets
* Track progress
* Goal completion percentage

### 📈 Reports & Analytics

* Monthly and yearly reports
* Expense trends
* Category-wise spending analysis
* Interactive charts

### 🤖 AI Financial Assistant

* AI-powered expense analysis
* Smart budgeting suggestions
* Spending pattern insights
* Personalized financial recommendations

### 🔐 Authentication

* Secure user registration
* Login with JWT Authentication
* Protected routes
* User profile management

---

## 🛠️ Tech Stack

### Frontend

* React.js
* JavaScript
* Tailwind CSS
* React Router
* Axios
* Recharts
* React Icons

### Backend

* Node.js
* Express.js
* Prisma ORM
* JWT Authentication
* bcrypt.js

### Database

* PostgreSQL

### AI

* Google Gemini API / OpenAI API (Optional)

---

## 📂 Project Structure

```text
Expense-AI/
│
├── client/
│   ├── src/
│   ├── public/
│   └── package.json
│
├── server/
│   ├── prisma/
│   ├── src/
│   ├── package.json
│   └── .env
│
└── README.md
```

---

## ⚙️ Installation

### 1. Clone Repository

```bash
git clone https://github.com/your-username/expense-ai.git
cd expense-ai
```

---

### 2. Install Dependencies

#### Frontend

```bash
cd client
npm install
```

#### Backend

```bash
cd ../server
npm install
```

---

### 3. Configure Environment Variables

Create a `.env` file inside the **server** directory.

```env
DATABASE_URL="postgresql://username:password@localhost:5432/expense_ai"

JWT_SECRET=your_jwt_secret

PORT=5000

GEMINI_API_KEY=your_api_key
```

---

### 4. Run Prisma

```bash
npx prisma generate
npx prisma migrate dev
```

---

### 5. Start Backend

```bash
npm run dev
```

---

### 6. Start Frontend

```bash
cd ../client
npm run dev
```

---

## 📸 Screenshots

Add screenshots of:

* Dashboard
* Expense Page
* Income Page
* Budget Planner
* Savings Goals
* Reports
* AI Assistant

---

## 📌 Future Enhancements

* AI Receipt Scanner
* OCR Bill Upload
* Voice Expense Entry
* Recurring Transactions
* Bank Account Integration
* Email Monthly Reports
* Mobile App
* Dark Mode
* Multi-Currency Support
* Export Reports (PDF & Excel)

---

## 🤝 Contributing

Contributions are welcome!

1. Fork the repository
2. Create a feature branch

```bash
git checkout -b feature/new-feature
```

3. Commit your changes

```bash
git commit -m "Add new feature"
```

4. Push to your branch

```bash
git push origin feature/new-feature
```

5. Open a Pull Request

---

## 📄 License

This project is licensed under the MIT License.

---

## 👨‍💻 Author

**Dharmendra Solanki**

* GitHub: https://github.com/your-username
* LinkedIn: https://linkedin.com/in/your-profile
* Email: [your-email@example.com](mailto:your-email@example.com)

---

⭐ If you found this project helpful, consider giving it a **Star** on GitHub!
