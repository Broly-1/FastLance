# Freelance Platform API - Features

This document outlines the core features and modules available in the Freelance Platform API, based on the current database schema, controllers, and routing structure.

## 1. User & Authentication Management
* **Roles:** Users can register as a `Buyer`, `Seller`, or `Both`.
* **Profile Management:** Users can manage their bio, profile picture, and active status.
* **Security:** Secure password hashing and authentication system.

## 2. Gigs (Services)
* **Service Listings:** Sellers can create and manage "Gigs" (services) with specific categories (Graphics, Programming, Writing, Video, Marketing).
* **Pricing & Delivery:** Sellers can define price, delivery days, and revision limits.
* **Media & Tagging:** Gigs support multiple image attachments and a robust tagging system for better discoverability.

## 3. Order Processing
* **Order Creation:** Buyers can place orders on specific gigs.
* **Status Tracking:** Comprehensive order lifecycle tracking (`Pending`, `In Progress`, `Delivered`, `Completed`, `Cancelled`, `Disputed`).
* **Deadlines:** Automated tracking of order dates and deadlines.

## 4. Order Submissions & Revisions
* **File Delivery:** Sellers can submit completed work, including file URLs and messages.
* **Revision System:** Buyers can request revisions on submissions, incrementing the revision count up to the seller's limit.

## 5. Messaging & Communication
* **Direct Messaging:** Buyers and Sellers can communicate directly through a built-in messaging system.
* **Contextual Chats:** Messages can be linked directly to a specific order.
* **Message Types:** Support for various message formats including `Text`, `File`, and `System` alerts.

## 6. Milestones
* **Phased Deliverables:** Large orders can be broken down into individual milestones.
* **Progress Tracking:** Milestones have their own deadlines, amounts, and statuses (`Pending`, `In Progress`, `Completed`, `Overdue`).
* **Critical Path:** Highlights which milestones are essential to project completion.

## 7. Invoicing
* **Financial Records:** Automated creation of invoices linked to specific orders or milestones.
* **Payment Tracking:** Status tracking for active invoices (`Pending`, `Paid`, `Overdue`) along with issue and due dates.

## 8. Financials & Wallet System
* **Internal Wallet:** Users have a platform wallet for handling their balance securely.
* **Transaction History:** Detailed logging of all financial movements (`TopUp`, `OrderPayment`, `Refund`, `Withdrawal`, `Earning`).

## 9. Review & Rating System
* **Feedback:** Buyers can leave 1-to-5 star ratings and written reviews upon order completion.
* **Seller Responses:** Sellers have the ability to publicly reply to reviews left by buyers.

## 10. Dispute Management
* **Conflict Resolution:** Either party can raise a dispute on an active order providing a reason and evidence.
* **Mediation:** Tracks open/resolved status to freeze funds or pause deadlines until an administrator intervenes.

## 11. Notifications
* **System Alerts:** Real-time push or system notifications to keep users updated on order updates, new messages, and transaction confirmations.

## 12. Reporting
* **System Analytics:** Administrative endpoints for generating system health, financial, and user activity reports.

## 13. Admin & Moderation
* **User Management:** Ability to remove/ban user profiles that violate platform rules.
* **Gig Moderation:** Ability to delete inappropriate or rule-breaking gigs (services).
* **Tag Management:** Create, edit, and manage global tags system for gigs.
* **Review Moderation:** Ability to delete or moderate inappropriate reviews and replies.
* **Refunds:** Capability to issue manual refunds when resolving disputes or platform issues.
* **Reporting & Exports:** View system reports and export platform data for analysis and compliance.
