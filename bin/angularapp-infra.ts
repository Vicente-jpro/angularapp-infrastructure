#!/usr/bin/env node
import * as cdk from 'aws-cdk-lib/core';
import { AmplifyHostingStack } from '../lib/amplify-stack';
import { HellowordStack } from '../lib/helloword-stack';

const app = new cdk.App();

const amplifyStack = new AmplifyHostingStack(app, 'AngularAppAmplifyStack', {});

const hellowordStack = new HellowordStack(app, 'HellowordStack', {});