/**
 * Nodemailer Mock
 * Mock email sending in tests
 */

const nodemailer = {
  createTransport: jest.fn().mockReturnValue({
    sendMail: jest.fn().mockResolvedValue({
      messageId: 'mock-message-id',
      accepted: ['recipient@example.com'],
      response: '250 OK'
    })
  })
};

module.exports = nodemailer;
