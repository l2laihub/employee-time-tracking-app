import * as React from 'react';

interface InviteEmailTemplateProps {
  organizationName: string;
  inviteUrl: string;
  role: string;
}

const InviteEmailTemplate: React.FC<InviteEmailTemplateProps> = ({
  organizationName,
  inviteUrl,
  role,
}) => (
  <div style={styles.body}>
    <div style={styles.container}>
      <div style={styles.card}>
        <div style={styles.logo}>
          <img
            src="https://clockflow.app/clockflow_logo.svg"
            alt="ClockFlow Logo"
            width="150"
            style={styles.logoImage}
          />
        </div>
        
        <h1 style={styles.heading}>
          You've Been Invited!
        </h1>
        
        <div style={styles.content}>
          <p style={styles.text}>
            <strong>{organizationName}</strong> has invited you to join their team as a <strong>{role.toLowerCase()}</strong> on ClockFlow, the employee time tracking platform that helps teams work better together.
          </p>
          
          <p style={styles.text}>
            As a {role.toLowerCase()}, you'll be able to:
          </p>
          
          <ul style={styles.list}>
            <li style={styles.listItem}>Track your work hours efficiently</li>
            <li style={styles.listItem}>Collaborate with your team members</li>
            <li style={styles.listItem}>Access important organization resources</li>
          </ul>
          
          <div style={styles.buttonContainer}>
            <a
              href={inviteUrl}
              style={styles.button}
            >
              Accept Invitation
            </a>
          </div>
          
          <p style={styles.note}>
            This link will expire in 7 days.
          </p>
        </div>
        
        <hr style={styles.hr} />
        
        <div style={styles.footerSection}>
          <p style={styles.footer}>
            If you don't recognize this invitation or believe it was sent in error, you can safely ignore this email.
          </p>
          
          <p style={styles.footer}>
            Having trouble with the button? Copy and paste this link into your browser:
          </p>
          
          <p style={styles.footer}>
            <a
              href={inviteUrl}
              style={styles.link}
            >
              {inviteUrl}
            </a>
          </p>
          
          <p style={styles.copyright}>
            © {new Date().getFullYear()} ClockFlow. All rights reserved.
          </p>
        </div>
      </div>
    </div>
  </div>
);

const styles = {
  body: {
    backgroundColor: '#f6f9fc',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    margin: 0,
    padding: 0,
  },
  container: {
    margin: '0 auto',
    padding: '20px',
    maxWidth: '600px',
  },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: '8px',
    boxShadow: '0 2px 8px rgba(0, 0, 0, 0.05)',
    padding: '40px 30px',
  },
  logo: {
    textAlign: 'center' as const,
    marginBottom: '30px',
  },
  logoImage: {
    maxWidth: '150px',
  },
  heading: {
    fontSize: '28px',
    letterSpacing: '-0.5px',
    lineHeight: '1.3',
    fontWeight: '600',
    color: '#333333',
    textAlign: 'center' as const,
    margin: '0 0 25px',
  },
  content: {
    padding: '0 10px',
  },
  text: {
    margin: '0 0 15px',
    fontSize: '16px',
    lineHeight: '1.5',
    color: '#3c4149',
  },
  list: {
    margin: '15px 0 25px',
    paddingLeft: '20px',
  },
  listItem: {
    margin: '8px 0',
    fontSize: '16px',
    lineHeight: '1.5',
    color: '#3c4149',
  },
  buttonContainer: {
    textAlign: 'center' as const,
    margin: '30px 0',
  },
  button: {
    backgroundColor: '#5469d4',
    borderRadius: '6px',
    color: '#fff',
    fontSize: '16px',
    fontWeight: '600',
    textDecoration: 'none',
    textAlign: 'center' as const,
    display: 'inline-block',
    padding: '14px 28px',
    boxShadow: '0 2px 5px rgba(84, 105, 212, 0.2)',
    transition: 'all 0.2s ease',
  },
  note: {
    textAlign: 'center' as const,
    fontSize: '14px',
    color: '#666666',
    margin: '10px 0 20px',
  },
  hr: {
    borderColor: '#e6ebf1',
    margin: '25px 0',
  },
  footerSection: {
    padding: '0 10px',
  },
  footer: {
    color: '#8898aa',
    fontSize: '13px',
    lineHeight: '1.5',
    margin: '8px 0',
  },
  link: {
    color: '#5469d4',
    textDecoration: 'none',
    wordBreak: 'break-all' as const,
  },
  copyright: {
    color: '#8898aa',
    fontSize: '12px',
    textAlign: 'center' as const,
    marginTop: '25px',
  },
};

export default InviteEmailTemplate;