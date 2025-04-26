const mockChannel = {
  assertExchange: jest.fn().mockImplementation(() => Promise.resolve({})),
  assertQueue: jest.fn().mockImplementation(() => Promise.resolve({})),
  publish: jest.fn(),
  sendToQueue: jest.fn(),
  close: jest.fn().mockImplementation(() => Promise.resolve()),
};

const mockConnection = {
  createChannel: jest.fn().mockImplementation(() => Promise.resolve(mockChannel)),
  close: jest.fn().mockImplementation(() => Promise.resolve()),
  on: jest.fn(),
};

export const connect = jest.fn().mockImplementation(() => Promise.resolve(mockConnection));

export default {
  connect,
};
