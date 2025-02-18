import * as React from 'react';
import {
  Html,
  Head,
  Body,
  Container,
  Section,
  Heading,
  Text,
  Button,
  Hr,
  Link,
} from '@react-email/components';

interface ReminderEmailTemplateProps {
  organizationName: string;
  inviteUrl: string;
  role: string;
  daysRemaining: number;
}

const ReminderEmailTemplate: React.FC<ReminderEmailTemplateProps> = ({
  organizationName,
  inviteUrl,
  role,
  daysRemaining,
}) => (
  <Html>
    <Head />
    <Body style={styles.body}>
      <Container style={styles.container}>
        <Section>
          <Heading style={styles.heading}>
            Reminder: Your Invitation to {organizationName}
          </Heading>
          <Text style={styles.text}>
            This is a reminder that you have a pending invitation to join {organizationName} as a {role.toLowerCase()}.
          </Text>
          <Text style={styles.text}>
            Your invitation will expire in {daysRemaining} {daysRemaining === 1 ? 'day' : 'days'}.
          </Text>
          <Button
            href={inviteUrl}
            style={styles.button}
          >
            Accept Invitation
          </Button>
          <Hr style={styles.hr} />
          <Text style={styles.footer}>
            If you don't want to join or believe this was sent in error, you can safely ignore this email.
          </Text>
          <Text style={styles.footer}>
            <Link
              href={inviteUrl}
              style={styles.link}
            >
              {inviteUrl}
            </Link>
          </Text>
        </Section>
      </Container>
    </Body>
  </Html>
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

export default ReminderEmailTemplate;