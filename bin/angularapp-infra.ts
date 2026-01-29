#!/usr/bin/env node
import * as cdk from 'aws-cdk-lib/core';
import { AmplifyHostingStack } from '../lib/amplify-stack';

const app = new cdk.App();

const amplifyStack = new AmplifyHostingStack(app, 'AngularAppAmplifyStack', {});