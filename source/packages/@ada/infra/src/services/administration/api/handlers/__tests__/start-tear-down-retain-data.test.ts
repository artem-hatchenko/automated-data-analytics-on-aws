/*! Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
SPDX-License-Identifier: Apache-2.0 */
import { DEFAULT_CALLER } from '../../../../../common/services/testing/default-entities';
import { TearDownMode } from '../types';
import { buildApiRequest } from '../../../../api/api-gateway';
import { handler } from '../start-tear-down-retain-data';

const mockInvokeAsync = jest.fn();

jest.mock('@ada/aws-sdk', () => ({
  ...(jest.requireActual('@ada/aws-sdk') as any),
  AwsLambdaInstance: jest.fn().mockImplementation(() => ({
    invokeAsync: (...args: any[]) => ({
      promise: jest.fn(() => Promise.resolve(mockInvokeAsync(...args))),
    }),
  })),
  SSM: jest.fn().mockImplementation(() => ({
    getParameter: (...args: any[]) => ({
      promise: jest.fn(() => Promise.resolve({
        Parameter: {
          Value: JSON.stringify([])
        }
      })),
    }),
  })),
}));

describe('start-tear-down-retain-data', () => {
  it('should invoke the tear down lambda in retain mode', async () => {
    const RETAINED_RESOURCES = ['arn:1', 'arn:2'];
    process.env.RETAINED_RESOURCES = JSON.stringify(RETAINED_RESOURCES);
    const response = await handler(buildApiRequest(DEFAULT_CALLER, {}) as any, null);
    expect(response.statusCode).toBe(200);
    expect(JSON.parse(response.body)).toEqual(
      expect.objectContaining({
        coreStackId: 'cfn-for-core-stack',
        mode: TearDownMode.RETAIN_DATA,
        retainedResources: RETAINED_RESOURCES,
      }),
    );

    expect(mockInvokeAsync).toHaveBeenCalledWith({
      FunctionName: 'tear-down-lambda-arn',
      InvokeArgs: JSON.stringify({ mode: TearDownMode.RETAIN_DATA }),
    });
  });
});
