// export enum ErrorCode {

import { createResponse } from './utils'

// }

export type ResponseError = {
  code: number //ErrorCode;
  message: string
}

export const TransactionInvalidFunctionSignature = () =>
  createErrorResponse({
    code: 4000,
    message: 'tx invalid, invalid function sig',
  })
export const TransactionInvalidNoData = () =>
  createErrorResponse({ code: 4001, message: 'tx invalid, no data' })
export const TransactionInvalidUnrecoverableSIgner = () =>
  createErrorResponse({
    code: 4002,
    message: 'tx invalid, cannot recover signer',
  })
export const TransactionInvalidMissingFields = () =>
  createErrorResponse({
    code: 4003,
    message: 'duration, startTime, sendTxHash are all required',
  })
export const NonceAlreadyUsed = () =>
  createErrorResponse({ code: 4004, message: 'nonce already used' })
export const TransactionCanAlreadyBeRevealed = () =>
  createErrorResponse({
    code: 4101,
    message: 'transaction can already be revealed',
  })
export const RevealTimeNotInOrder = () =>
  createErrorResponse({ code: 4102, message: 'reveal time not in order' })
export const NoncesNotInOrder = () =>
  createErrorResponse({ code: 4103, message: 'nonce not in order' })
export const NoReveal = () =>
  createErrorResponse(
    { code: 5000, message: 'UNEXPECTED ERROR: No Reveal' },
    500,
  )
export const AlreadyPending = () =>
  createErrorResponse({
    code: 4005,
    message: 'Transaction for that reveal is already underway',
  }) // TODO parametrise to print tx info (hash, nonce)

export const InvalidFeesScheduleSubmission = () =>
  createErrorResponse({
    code: 4008,
    message:
      'Invalid submission for fee schedule, need to be an array of 3 elements with delay in increasing order',
  })

export const DifferentChainIdDetected = () =>
  createErrorResponse({
    code: 5556,
    message:
      'different chainId detected, please check the ethereum node config',
  })
export const PaymentAddressChangeDetected = () =>
  createErrorResponse({
    code: 5555,
    message: 'the payment contract address has changed',
  })

export const InvalidMethod = () =>
  createErrorResponse({ code: 4444, message: 'Invalid Method' })

export const NotAuthorized = () =>
  createErrorResponse({ code: 4202, message: 'Not authorized' })
export const NotRegistered = () =>
  createErrorResponse({ code: 4200, message: 'Account not registered' })
export const NotEnoughBalance = () =>
  createErrorResponse({
    code: 4201,
    message: 'Account have less than the minimum balance',
  }) // TODO parametrise to print balance required
export const InvalidNonce = () =>
  createErrorResponse({ code: 4300, message: 'invalid nonce provided/signed' })

export const AlreadyExistsButDifferent = () =>
  createErrorResponse({
    code: 4555,
    message: 'already queued but with different data',
  })

export const NoDelegateRegistered = () =>
  createErrorResponse({
    code: 4400,
    message: 'No Delegate registered for that account',
  })
export const InvalidDelegate = () =>
  createErrorResponse({
    code: 4401,
    message: 'Delegate not matching with the one registered with that account',
  })

export const UnknownRequestType = () =>
  createErrorResponse({ code: 4401, message: 'Unknown request type' }) // TODO parametrise to print request type

export function createErrorResponse(
  responseError: ResponseError,
  status: number = 400,
): Response {
  return createResponse({ error: responseError }, { status })
}
