#!/usr/bin/env node
import * as cdk from 'aws-cdk-lib/core';
import { AmplifyHostingStack } from '../lib/amplify-stack';
import { HellowordStack } from '../lib/helloword-stack';
import { CognitoStack } from '../lib/coginito-stack';

const app = new cdk.App();

const cognitoStack = new CognitoStack(app, 'CognitoStack');

// DEPLOY Angular frontend app from github repo: vicente-jpro/angularapp
const amplifyStack = new AmplifyHostingStack(app, 'AngularAppAmplifyStack', {
    userPoolId: cognitoStack.userPoolId,
    userPoolClientId: cognitoStack.userPoolClientId,
    identityPoolId: cognitoStack.identityPoolId,
});

// DEPLOY Angular frontend app from github repo: vicente-jpro/helloword
const hellowordStack = new HellowordStack(app, 'HellowordStack', {});