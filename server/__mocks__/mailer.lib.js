/**
 * Mailer Mock
 * Mock email sending module
 */

const sendMail = jest.fn().mockResolvedValue({
  success: true,
  messageId: 'mock-message-id'
});

module.exports = {
  sendMail
};
