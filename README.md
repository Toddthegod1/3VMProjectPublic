# 3VMProject – Personal Finance Tracker

This project demonstrates deploying a simple personal finance web application using **three virtual machines** provisioned with Vagrant + VirtualBox.  
It is an assignment for COSC349 (Cloud Computing & Virtualisation).

---

## Overview

The application helps users:
- Record **transactions** (income & expenses)
- Define and manage **budgets**
- View **summaries** (income, expenses, and net balance)  
- Track **spending by category**

---

## Architecture

The system is split across **3 VMs** for modularity and portability:

1. **db-vm** – PostgreSQL database (stores transactions & budgets)
2. **api-vm** – Node.js/Express API (business logic, REST endpoints)
3. **web-vm** – Nginx web server (serves frontend & proxies API calls)

Flow:  
`Browser → web-vm (Nginx) → api-vm (Express API) → db-vm (PostgreSQL)`

---

## Quick Start

1. **Clone the repository**
   git clone https://github.com/Toddthegod1/3VMProject.git
   cd 3VMProject
2. **Start the VMs**
    vagrant up


3. **Access the app**
    Open http://localhost:8080 in your browser.