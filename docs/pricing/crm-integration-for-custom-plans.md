# CRM Integration for Custom Subscription Plans

## Overview

This document outlines the process for documenting and managing custom subscription plans in the CRM system. Proper CRM documentation is essential for maintaining accurate records, ensuring consistent client communication, and enabling effective account management for non-standard pricing arrangements.

## CRM System Configuration

### 1. Custom Fields Setup

#### Organization/Account Object

Add the following custom fields to the organization/account object:

| Field Name | Type | Description | Values |
|------------|------|-------------|--------|
| Has Custom Plan | Boolean | Indicates if the organization has a custom pricing plan | True/False |
| Custom Plan Code | Text | Unique identifier for the custom plan | e.g., "CUSTOM_15USER_99" |
| Custom Plan Start Date | Date | When the custom plan begins | Date |
| Custom Plan End Date | Date | When the custom plan expires | Date |
| Custom Plan Monthly Price | Currency | Fixed monthly price for the custom plan | e.g., $99.00 |
| Custom Plan Annual Price | Currency | Fixed annual price for the custom plan | e.g., $1,069.20 |
| User Limit | Number | Maximum number of users allowed | e.g., 15 |
| Effective Per-User Price | Currency (Formula) | Calculated field: Monthly Price ÷ User Limit | e.g., $6.60 |
| Standard Equivalent Plan | Picklist | The standard plan most similar to this custom plan | Free, Essentials, Professional, Business, Enterprise |
| Discount Percentage | Percentage (Formula) | Calculated discount from standard pricing | e.g., 17.5% |
| Next Review Date | Date | When to review the custom plan arrangement | Date |
| Renewal Strategy | Picklist | Approach for renewal | Convert to Standard, Renew Custom, Evaluate Needs, Upsell |

#### Opportunity Object

Add custom fields to track opportunities related to custom plans:

| Field Name | Type | Description | Values |
|------------|------|-------------|--------|
| Custom Plan Requested | Boolean | Indicates if prospect requested custom pricing | True/False |
| Requested User Count | Number | Number of users requested | e.g., 15 |
| Requested Price Point | Currency | Target price point requested by prospect | e.g., $99.00 |
| Custom Plan Approved | Boolean | Indicates if custom pricing was approved | True/False |
| Approval Reference | Text | Reference ID or email for approval | e.g., "APP-2025-03-15-001" |
| Approved By | Lookup | User who approved the custom plan | [User Reference] |

#### Contact Object

Add fields to track contacts involved in custom plan decisions:

| Field Name | Type | Description | Values |
|------------|------|-------------|--------|
| Custom Plan Decision Maker | Boolean | Indicates if contact is decision maker for plan | True/False |
| Custom Plan Billing Contact | Boolean | Indicates if contact receives billing info | True/False |
| Custom Plan Renewal Contact | Boolean | Indicates if contact handles renewals | True/False |

### 2. Custom Objects

Create a new custom object for detailed custom plan tracking:

#### Custom Plan Details Object

| Field Name | Type | Description | Values |
|------------|------|-------------|--------|
| Custom Plan ID | Text (External ID) | Unique identifier | e.g., "CUSTOM_15USER_99" |
| Organization | Lookup | Associated organization | [Organization Reference] |
| Plan Name | Text | Descriptive name | e.g., "Custom Essentials - 15 Users" |
| Status | Picklist | Current status | Draft, Approved, Active, Expired, Renewed |
| Monthly Price | Currency | Fixed monthly price | e.g., $99.00 |
| Annual Price | Currency | Fixed annual price | e.g., $1,069.20 |
| User Limit | Number | Maximum users | e.g., 15 |
| Features Included | Multi-select | Features included in plan | [List of Features] |
| Features Excluded | Multi-select | Standard features excluded | [List of Features] |
| Justification | Text Area | Business justification | [Detailed Text] |
| Approval Chain | Text Area | Documentation of approvals | [Detailed Text] |
| Special Terms | Text Area | Any special conditions | [Detailed Text] |
| Internal Notes | Text Area | Notes for internal reference | [Detailed Text] |

#### Custom Plan Review Object

Create a related object to track periodic reviews:

| Field Name | Type | Description | Values |
|------------|------|-------------|--------|
| Custom Plan | Lookup | Related custom plan | [Custom Plan Reference] |
| Review Date | Date | Date of review | Date |
| Reviewer | Lookup | Person conducting review | [User Reference] |
| Current User Count | Number | Users at time of review | e.g., 13 |
| User Limit Utilization | Percentage (Formula) | Current Users ÷ User Limit | e.g., 87% |
| Feature Utilization | Percentage | Percentage of features being used | e.g., 75% |
| Recommendation | Picklist | Next steps recommendation | Continue, Modify, Convert to Standard, Upsell |
| Notes | Text Area | Detailed review notes | [Detailed Text] |
| Follow-up Actions | Text Area | Required actions | [Detailed Text] |
| Next Review Date | Date | Date for next review | Date |

### 3. Automation Setup

#### Workflow Rules / Process Builder

1. **Custom Plan Creation Notification**
   - Trigger: New Custom Plan record created
   - Action: Notify account team, billing department, and product team

2. **User Limit Warning**
   - Trigger: Organization approaches user limit (e.g., 80%)
   - Action: Create task for account manager to discuss upgrade options

3. **Review Date Reminder**
   - Trigger: 30 days before Next Review Date
   - Action: Create task for account manager to prepare review

4. **Renewal Notification Series**
   - Trigger: 90, 60, 30 days before Custom Plan End Date
   - Action: Create tasks for renewal discussion and preparation

#### Custom Plan Dashboard

Create a dashboard with the following components:

1. **Custom Plan Overview**
   - Count of active custom plans
   - Distribution by equivalent standard plan
   - Average discount percentage
   - User limit utilization

2. **Renewal Pipeline**
   - Custom plans expiring in next 30/60/90 days
   - Renewal status tracking
   - Conversion opportunities

3. **Financial Impact**
   - Revenue from custom plans
   - Discount impact analysis
   - Upgrade/expansion opportunities

## Documentation Procedures

### 1. Initial Setup Documentation

When creating a new custom subscription plan, ensure the following documentation is completed:

#### Required Information

1. **Client Details**
   - Organization name and CRM ID
   - Primary contact information
   - Decision maker information
   - Billing contact information

2. **Plan Specifications**
   - User limit
   - Monthly and annual pricing
   - Contract term length
   - Feature inclusions/exclusions
   - Special terms or conditions

3. **Approval Documentation**
   - Business justification
   - Pricing analysis (standard vs. custom)
   - Approval emails or documentation
   - Final approval reference

#### Documentation Process

1. Create new Custom Plan Details record
2. Update Organization record with custom plan fields
3. Attach approval documentation to Custom Plan record
4. Set up initial review schedule
5. Document communication plan for client

### 2. Ongoing Management

#### Regular Review Process

1. **Quarterly Usage Review**
   - Document current user count
   - Calculate limit utilization
   - Review feature usage
   - Assess satisfaction and potential issues

2. **Financial Review**
   - Compare revenue to standard plan equivalent
   - Document any changes in usage patterns
   - Update lifetime value projections
   - Identify upsell/cross-sell opportunities

3. **Documentation Updates**
   - Create new Custom Plan Review record
   - Update next review date
   - Document any changes to requirements
   - Update renewal strategy if needed

#### Client Communication Documentation

1. **Meeting Notes**
   - Document all discussions about the custom plan
   - Record client feedback and requests
   - Note any commitments made by either party
   - Attach meeting notes to the Custom Plan record

2. **Change Requests**
   - Document any requests for plan modifications
   - Record approval/denial of requests
   - Update CRM records if changes are implemented
   - Track impact of changes on client satisfaction

### 3. Renewal Process

#### Pre-Renewal Documentation

1. **90-Day Pre-Renewal Review**
   - Comprehensive usage analysis
   - Document growth patterns
   - Identify potential issues or opportunities
   - Develop renewal strategy recommendation

2. **Renewal Options Documentation**
   - Document all options to be presented
   - Include pricing and feature comparisons
   - Note potential impact of each option
   - Record internal recommendations

#### Renewal Decision Documentation

1. **Client Decision**
   - Document final renewal decision
   - Record any negotiation details
   - Note changes from previous arrangement
   - Update all relevant CRM records

2. **New Term Setup**
   - Create new Custom Plan record if terms change
   - Update Organization record with new details
   - Document approval of new arrangement
   - Set up review schedule for new term

## Example: Documenting $99/month for 15 Users Plan

### Initial Setup

1. **Create Custom Plan Details Record**

   ```
   Custom Plan ID: CUSTOM_15USER_99
   Organization: Acme Corporation
   Plan Name: Custom Essentials - 15 Users
   Status: Approved
   Monthly Price: $99.00
   Annual Price: $1,069.20
   User Limit: 15
   Features Included: [All Essentials features]
   Features Excluded: []
   Justification: Strategic account with growth potential. Client has budget constraints but needs all Essentials features.
   Approval Chain: Requested by John Smith (Sales), Approved by Jane Doe (Sales Director) on 2025-03-15
   Special Terms: Client commits to quarterly business reviews and consideration of Professional tier at next renewal.
   Internal Notes: Potential for expansion to 25+ users within 12 months based on client growth projections.
   ```

2. **Update Organization Record**

   ```
   Has Custom Plan: True
   Custom Plan Code: CUSTOM_15USER_99
   Custom Plan Start Date: 2025-04-01
   Custom Plan End Date: 2026-03-31
   Custom Plan Monthly Price: $99.00
   Custom Plan Annual Price: $1,069.20
   User Limit: 15
   Effective Per-User Price: $6.60
   Standard Equivalent Plan: Essentials
   Discount Percentage: 17.5%
   Next Review Date: 2025-07-01
   Renewal Strategy: Evaluate Needs
   ```

3. **Document Contacts**

   ```
   Primary Contact: Sarah Johnson
   Custom Plan Decision Maker: True
   Custom Plan Billing Contact: False
   Custom Plan Renewal Contact: True

   Finance Contact: Michael Brown
   Custom Plan Decision Maker: False
   Custom Plan Billing Contact: True
   Custom Plan Renewal Contact: False
   ```

### Quarterly Review Documentation

Create a Custom Plan Review record after the first quarterly review:

```
Custom Plan: CUSTOM_15USER_99
Review Date: 2025-07-01
Reviewer: Alex Rodriguez (Account Manager)
Current User Count: 13
User Limit Utilization: 87%
Feature Utilization: 92%
Recommendation: Continue with monitoring for potential upgrade
Notes: Client is approaching user limit faster than anticipated. All key features are being actively used. Client has expressed interest in some Professional tier features.
Follow-up Actions: Schedule demo of Professional tier features, prepare upgrade proposal for next review
Next Review Date: 2025-10-01
```

### Renewal Documentation

Create comprehensive documentation during renewal process:

```
Pre-Renewal Analysis:
- Current user count: 15 (100% of limit)
- Growth projection: +10 users in next 6 months
- Feature requests: Advanced reporting, team calendar
- Client satisfaction: High (9/10)
- Budget constraints: Can increase to $199/month

Renewal Options Presented:
1. Renew current custom plan: $99/mo for 15 users
2. Modified custom plan: $199/mo for 25 users
3. Standard Professional plan: $15/user/mo with annual commitment

Client Decision:
- Selected modified custom plan: $199/mo for 25 users
- 12-month term with quarterly reviews
- Added team calendar feature from Professional tier

New Custom Plan Details:
- Custom Plan ID: CUSTOM_25USER_199
- Effective Per-User Price: $7.96
- Discount from Standard: 20.4%
- Approval Reference: APP-2026-03-15-002
```

## Best Practices for CRM Documentation

### 1. Consistency and Completeness

- Use standardized naming conventions for custom plans
- Complete all required fields for every custom plan
- Maintain consistent documentation format
- Link all related records and documents

### 2. Accessibility and Visibility

- Ensure custom plan details are visible to all relevant teams
- Create custom list views for easy access to custom plan information
- Include custom plan status in account overview dashboards
- Configure alerts for critical milestones and changes

### 3. Security and Compliance

- Restrict sensitive pricing information to appropriate roles
- Document approval history for audit purposes
- Maintain record of all pricing decisions and justifications
- Ensure compliance with internal pricing policies

### 4. Analysis and Reporting

- Create regular reports on custom plan performance
- Track conversion rates from custom to standard plans
- Monitor discount levels and financial impact
- Analyze patterns to inform future pricing strategy

## Conclusion

Proper CRM documentation of custom subscription plans is essential for maintaining accurate records, ensuring consistent client communication, and enabling effective account management. By following these guidelines, organizations can implement and manage custom pricing arrangements while maintaining system integrity and business visibility.

The structured approach outlined in this document ensures that all aspects of custom plans are properly documented, from initial setup through ongoing management to renewal decisions, providing a complete audit trail and enabling data-driven decision making.