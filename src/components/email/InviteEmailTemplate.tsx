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
      <div>
        <h1 style={styles.heading}>
          Join {organizationName}
        </h1>
        <p style={styles.text}>
          You've been invited to join {organizationName} as a {role.toLowerCase()}.
        </p>
        <a
          href={inviteUrl}
          style={styles.button}
        >
          Accept Invitation
        </a>
        <hr style={styles.hr} />
        <p style={styles.footer}>
          This invitation will expire in 7 days. If you don't want to join or believe this was sent in error, you can safely ignore this email.
        </p>
        <p style={styles.footer}>
          <a
            href={inviteUrl}
            style={styles.link}
          >
            {inviteUrl}
          </a>
        </p>
      </div>
    </div>
  </div>
);

const styles = {
  body: {
    backgroundColor: '#f6f9fc',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
  },
  container: {
    margin: '0 auto',
    padding: '20px 0 48px',
    width: '560px',
  },
  heading: {
    fontSize: '24px',
    letterSpacing: '-0.5px',
    lineHeight: '1.3',
    fontWeight: '400',
    color: '#484848',
    padding: '17px 0 0',
  },
  text: {
    margin: '0 0 15px',
    fontSize: '15px',
    lineHeight: '1.4',
    color: '#3c4149',
  },
  button: {
    backgroundColor: '#5469d4',
    borderRadius: '5px',
    color: '#fff',
    fontSize: '15px',
    textDecoration: 'none',
    textAlign: 'center' as const,
    display: 'block',
    width: '210px',
    padding: '14px 7px',
    margin: '20px auto',
  },
  hr: {
    borderColor: '#e6ebf1',
    margin: '20px 0',
  },
  footer: {
    color: '#8898aa',
    fontSize: '12px',
    lineHeight: '1.5',
  },
  link: {
    color: '#5469d4',
    textDecoration: 'none',
  },
};

export default InviteEmailTemplate;