# Escalation Configuration Guide

## Where Escalated Content Goes

The Content Moderation Assistant can send escalated content to multiple destinations. Here are your options:

### 1. **Local Storage (Default)**
- **What**: Stored in Chrome's local storage
- **Where**: `chrome.storage.local` under `escalationLogs`
- **Pros**: Private, fast, no external dependencies
- **Cons**: Only accessible on this browser/computer
- **Use Case**: Personal use, testing, privacy-focused moderation

### 2. **Clipboard**
- **What**: Formatted report copied to clipboard
- **Where**: Your system clipboard
- **Pros**: Easy to paste into other applications
- **Cons**: Manual process, temporary
- **Use Case**: Quick sharing, manual reporting

### 3. **Local File Download**
- **What**: Text file automatically downloaded
- **Where**: Your Downloads folder
- **Pros**: Permanent record, easy to organize
- **Cons**: Manual file management
- **Use Case**: Archiving, offline review

### 4. **External API**
- **What**: Sent to your moderation system's API
- **Where**: Your company's moderation platform
- **Pros**: Integrated with existing workflow
- **Cons**: Requires API setup
- **Use Case**: Enterprise moderation teams

### 5. **Email**
- **What**: Opens email client with formatted report
- **Where**: Your email application
- **Pros**: Easy to send to team members
- **Cons**: Manual sending process
- **Use Case**: Small teams, email-based workflows

### 6. **Slack Integration**
- **What**: Sent to Slack channel via webhook
- **Where**: Your Slack workspace
- **Pros**: Real-time team notifications
- **Cons**: Requires Slack webhook setup
- **Use Case**: Team-based moderation

### 7. **Discord Integration**
- **What**: Sent to Discord channel via webhook
- **Where**: Your Discord server
- **Pros**: Real-time notifications, good for communities
- **Cons**: Requires Discord webhook setup
- **Use Case**: Community moderation

## Configuration Examples

### Basic Local Storage (Current Default)
```javascript
destinations: {
    local: true,
    clipboard: false,
    file: false,
    api: false,
    email: false,
    slack: false,
    discord: false
}
```

### Team Workflow with Slack
```javascript
destinations: {
    local: true,
    clipboard: true,
    file: false,
    api: false,
    email: false,
    slack: true,
    discord: false
},
slack: {
    webhookUrl: 'https://hooks.slack.com/services/YOUR/SLACK/WEBHOOK'
}
```

### Enterprise API Integration
```javascript
destinations: {
    local: true,
    clipboard: false,
    file: true,
    api: true,
    email: false,
    slack: false,
    discord: false
},
api: {
    url: 'https://your-moderation-api.com/escalate',
    headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer YOUR_API_KEY'
    }
}
```

### Personal Use with File Backup
```javascript
destinations: {
    local: true,
    clipboard: true,
    file: true,
    api: false,
    email: false,
    slack: false,
    discord: false
}
```

## Setup Instructions

### For Slack Integration:
1. Go to your Slack workspace
2. Create a new app or use existing one
3. Enable Incoming Webhooks
4. Create a webhook URL
5. Add the URL to your configuration

### For API Integration:
1. Set up your moderation API endpoint
2. Configure authentication (API key, OAuth, etc.)
3. Update the API configuration in the extension
4. Test with a sample escalation

### For Email Integration:
1. Configure the recipient email address
2. Customize the email subject template
3. Test by escalating content

## Data Format

Each escalation includes:
- **Unique ID**: For tracking and reference
- **Timestamp**: When the escalation occurred
- **Content**: The actual content that was escalated
- **Rule**: Which rule triggered the escalation
- **Severity**: Low, Medium, or High
- **URL**: Where the content was found
- **Screenshot**: Visual capture of the page
- **User Info**: Any detected user information
- **Metadata**: Browser info, tab details, etc.

## Privacy Considerations

- **Local Storage**: Completely private, data stays on your device
- **Clipboard**: Temporary, cleared when you copy something else
- **Files**: Stored locally on your computer
- **API/External**: Data sent to external systems - ensure compliance with your privacy policies
- **Email**: Sent through your email provider
- **Slack/Discord**: Sent to your team's workspace

## Recommendations

### For Individual Moderators:
- Use Local Storage + Clipboard + File Download
- Keep everything local for privacy
- Use clipboard for quick sharing when needed

### For Small Teams (2-5 people):
- Use Local Storage + Slack
- Real-time notifications for team coordination
- Keep local backup for records

### For Enterprise Teams:
- Use Local Storage + API Integration
- Integrate with existing moderation workflows
- Ensure compliance with data policies

### For Community Moderation:
- Use Local Storage + Discord
- Real-time alerts for community managers
- Easy to set up and manage
