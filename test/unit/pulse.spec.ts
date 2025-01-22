/* eslint-disable no-console,no-unused-expressions,@typescript-eslint/no-unused-expressions */

import { Db } from 'mongodb';

import { Pulse } from '../../src';
import { Job } from '../../src/job';
import { hasMongoProtocol } from '../../src/pulse/has-mongo-protocol';
import { mockMongoDb } from '../helpers/mock.helper';

describe('Test Pulse', () => {
  const jobTimeout = 500;
  const jobProcessor = () => {};

  let globalPulseInstance: Pulse;
  let mongoDb: Db;
  let mongoDbConfig: string;
  let mongoDbDisconnect: () => Promise<void>;
  const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
  const clearJobs = async (): Promise<void> => {
    if (mongoDb) {
      await mongoDb.collection('pulseJobs').deleteMany({});
    }
  };

  beforeEach(async () => {
    const { mongo, uri, disconnect } = await mockMongoDb();
    mongoDb = mongo.db();
    mongoDbConfig = uri;
    mongoDbDisconnect = disconnect;
    globalPulseInstance = new Pulse({ mongo: mongoDb });
    delay(50);
    await clearJobs();
    ['someJob', 'send email', 'some job'].forEach((job) => {
      globalPulseInstance.define(job, jobProcessor);
    });
  });

  afterEach(async () => {
    await clearJobs();
    await globalPulseInstance.stop();
  });

  afterAll((done) => {
    delay(50);
    mongoDbDisconnect();
    done();
  });

  describe('Test config', () => {
    describe('Test mongo connection tester', () => {
      test('passing a valid server connection string', () => {
        expect(hasMongoProtocol(mongoDbConfig)).toEqual(true);
      });

      test('passing a valid multiple server connection string', () => {
        expect(hasMongoProtocol(`mongodb+srv://localhost/pulse-test`)).toEqual(true);
      });

      test('passing an invalid connection string', () => {
        expect(hasMongoProtocol(`localhost/pulse-test`)).toEqual(false);
      });
    });
    describe('Test mongo', () => {
      test('sets the _db directly when passed as an option', () => {
        const pulseDb = new Pulse({ mongo: mongoDb });
        expect(pulseDb._mdb).not.toBeUndefined();
      });

      test('sets the _db directly', () => {
        const pulse = new Pulse();
        pulse.mongo(mongoDb);
        expect(pulse._mdb).not.toBeUndefined();
      });

      test('returns itself', async () => {
        const pulse = new Pulse();
        expect(await pulse.mongo(mongoDb)).toEqual(pulse);
      });
    });

    describe('Test processEvery', () => {
      test('sets the default processEvery', () => {
        expect(globalPulseInstance._processEvery).toEqual(5000);
      });
      test('sets the custom processEvery', () => {
        const pulse = new Pulse({ processEvery: '3 minutes' });
        expect(pulse._processEvery).toEqual(180000);
      });
      test('returns itself', () => {
        expect(globalPulseInstance.processEvery('3 minutes')).toEqual(globalPulseInstance);
      });
    });

    describe('Test name', () => {
      test('sets the pulse name', () => {
        globalPulseInstance.name('test queue');
        expect(globalPulseInstance._name).toEqual('test queue');
      });
      test('returns itself', () => {
        expect(globalPulseInstance.name('test queue')).toEqual(globalPulseInstance);
      });
    });

    describe('Test maxConcurrency', () => {
      test('sets the default maxConcurrency', () => {
        expect(globalPulseInstance._maxConcurrency).toEqual(20);
      });

      test('sets the custom maxConcurrency', () => {
        globalPulseInstance.maxConcurrency(10);
        expect(globalPulseInstance._maxConcurrency).toEqual(10);
      });
      test('returns itself', () => {
        expect(globalPulseInstance.maxConcurrency(10)).toEqual(globalPulseInstance);
      });
    });

    describe('Test default defaultConcurrency', () => {
      test('sets the defaultConcurrency', () => {
        expect(globalPulseInstance._defaultConcurrency).toEqual(5);
      });

      test('sets the custom defaultConcurrency', () => {
        globalPulseInstance.defaultConcurrency(1);
        expect(globalPulseInstance._defaultConcurrency).toEqual(1);
      });
      test('returns itself', () => {
        expect(globalPulseInstance.defaultConcurrency(1)).toEqual(globalPulseInstance);
      });

      test('is inherited by jobs', () => {
        globalPulseInstance.defaultConcurrency(10);
        globalPulseInstance.define('testDefaultConcurrency', () => {});
        expect(globalPulseInstance._definitions.testDefaultConcurrency.concurrency).toEqual(10);
      });
    });

    describe('Test lockLimit', () => {
      test('sets the default lockLimit', () => {
        expect(globalPulseInstance._lockLimit).toEqual(0);
      });

      test('sets the custom lockLimit', () => {
        globalPulseInstance.lockLimit(10);
        expect(globalPulseInstance._lockLimit).toEqual(10);
      });
      test('returns itself', () => {
        expect(globalPulseInstance.lockLimit(10)).toEqual(globalPulseInstance);
      });
    });

    describe('Test defaultLockLimit', () => {
      test('sets the default defaultLockLimit', () => {
        expect(globalPulseInstance._defaultLockLimit).toEqual(0);
      });

      test('sets the custom defaultLockLimit', () => {
        globalPulseInstance.defaultLockLimit(1);
        expect(globalPulseInstance._defaultLockLimit).toEqual(1);
      });
      test('returns itself', () => {
        expect(globalPulseInstance.defaultLockLimit(5)).toEqual(globalPulseInstance);
      });

      test('is inherited by jobs', () => {
        globalPulseInstance.defaultLockLimit(10);
        globalPulseInstance.define('testDefaultLockLimit', () => {});
        expect(globalPulseInstance._definitions.testDefaultLockLimit.lockLimit).toEqual(10);
      });
    });

    describe('Test defaultLockLifetime', () => {
      test('sets the default defaultLockLifetime', () => {
        expect(globalPulseInstance._defaultLockLifetime).toEqual(600000);
      });

      test('sets the custom defaultLockLifetime', () => {
        globalPulseInstance.defaultLockLifetime(9999);
        expect(globalPulseInstance._defaultLockLifetime).toEqual(9999);
      });

      test('returns itself', () => {
        expect(globalPulseInstance.defaultLockLifetime(1000)).toEqual(globalPulseInstance);
      });

      test('is inherited by jobs', () => {
        globalPulseInstance.defaultLockLifetime(7777);
        globalPulseInstance.define('testDefaultLockLifetime', () => {});
        expect(globalPulseInstance._definitions.testDefaultLockLifetime.lockLifetime).toEqual(7777);
      });
    });

    describe('Test sort', () => {
      test('sets the default sort', () => {
        expect(globalPulseInstance._sort).toEqual({ nextRunAt: 1, priority: -1 });
      });

      test('sets the custom sort', () => {
        globalPulseInstance.sort({ nextRunAt: -1 });
        expect(globalPulseInstance._sort).toEqual({ nextRunAt: -1 });
      });

      test('returns itself', () => {
        expect(globalPulseInstance.sort({ nextRunAt: 1, priority: 1 })).toEqual(globalPulseInstance);
      });
    });

    describe('Test resumeOnRestart', () => {
      test('sets the default resumeOnRestart', () => {
        expect(globalPulseInstance._resumeOnRestart).toBeTruthy();
      });

      test('sets the custom resumeOnRestart', () => {
        globalPulseInstance.resumeOnRestart(false);
        expect(globalPulseInstance._resumeOnRestart).toBeFalsy();
      });

      test('returns itself', () => {
        expect(globalPulseInstance.resumeOnRestart(false)).toEqual(globalPulseInstance);
      });

      // test('should not reschedule successfully finished non-recurring jobs', async () => {
      //   const job = globalPulseInstance.create('sendEmail', { to: 'user@example.com' });
      //   job.attrs.lastFinishedAt = new Date();
      //   job.attrs.nextRunAt = null;
      //   await job.save();

      //   await globalPulseInstance.resumeOnRestart();

      //   const updatedJob = (await globalPulseInstance.jobs({ name: 'sendEmail' }))[0];
      //   expect(updatedJob.attrs.nextRunAt).toBeNull();
      // });

      test('should resume non-recurring jobs on restart', async () => {
        const job = globalPulseInstance.create('sendEmail', { to: 'user@example.com' });
        job.attrs.nextRunAt = new Date(Date.now() - 2000);
        await job.save();

        await globalPulseInstance.resumeOnRestart();

        const updatedJob = (await globalPulseInstance.jobs({ name: 'sendEmail' }))[0];
        expect(updatedJob.attrs.nextRunAt?.getTime()).toBeGreaterThan(Date.now() - 100);
      });

      test('should resume recurring jobs on restart - interval', async () => {
        const job = globalPulseInstance.create('sendEmail', { to: 'user@example.com' });
        job.attrs.repeatInterval = '5 minutes';
        job.attrs.nextRunAt = null;
        await job.save();

        await globalPulseInstance.resumeOnRestart();

        const updatedJob = (await globalPulseInstance.jobs({ name: 'sendEmail' }))[0];
        expect(updatedJob.attrs.nextRunAt).not.toBeNull();
      });

      test('should compute nextRunAt after running a recurring job', async () => {
        let executionCount = 0;

        globalPulseInstance.define('recurringJob', async () => {
          executionCount++;
        });

        const job = globalPulseInstance.create('recurringJob', { key: 'value' });
        job.attrs.repeatInterval = '5 minutes';
        await job.save();

        globalPulseInstance.processEvery('1 second');
        await globalPulseInstance.start();

        await new Promise((resolve) => setTimeout(resolve, 4000));

        const updatedJob = (await globalPulseInstance.jobs({ name: 'recurringJob' }))[0];

        expect(executionCount).toBeGreaterThan(0);
        expect(updatedJob.attrs.lastRunAt).not.toBeNull();
        expect(updatedJob.attrs.nextRunAt).not.toBeNull();
        expect(updatedJob.attrs.nextRunAt?.getTime()).toBeGreaterThan(Date.now() - 100);
      });

      test('should resume recurring jobs on restart - cron', async () => {
        const job = globalPulseInstance.create('sendEmail', { to: 'user@example.com' });
        job.attrs.repeatInterval = '*/5 * * * *';
        job.attrs.nextRunAt = null;
        await job.save();

        await globalPulseInstance.resumeOnRestart();

        const updatedJob = (await globalPulseInstance.jobs({ name: 'sendEmail' }))[0];
        expect(updatedJob.attrs.nextRunAt).not.toBeNull();
      });

      test('should resume recurring jobs on restart - repeatAt', async () => {
        const job = globalPulseInstance.create('sendEmail', { to: 'user@example.com' });
        job.attrs.repeatAt = '1:00 am';
        job.attrs.nextRunAt = null;
        await job.save();

        await globalPulseInstance.resumeOnRestart();

        const updatedJob = (await globalPulseInstance.jobs({ name: 'sendEmail' }))[0];
        expect(updatedJob.attrs.nextRunAt).not.toBeNull();
      });

      test('should not modify jobs with existing nextRunAt', async () => {
        const futureDate = new Date(Date.now() + 60 * 60 * 1000);
        const job = globalPulseInstance.create('sendEmail', { to: 'user@example.com' });
        job.attrs.nextRunAt = futureDate;
        await job.save();

        await globalPulseInstance.resumeOnRestart();

        const updatedJob = (await globalPulseInstance.jobs({ name: 'sendEmail' }))[0];
        expect(updatedJob.attrs.nextRunAt?.getTime()).toEqual(futureDate.getTime());
      });

      test('should handle jobs that started but have not finished (non-recurring)', async () => {
        const job = globalPulseInstance.create('processData', { data: 'sample' });
        job.attrs.nextRunAt = null;
        job.attrs.lockedAt = new Date();
        await job.save();

        await globalPulseInstance.resumeOnRestart();

        const updatedJob = (await globalPulseInstance.jobs({ name: 'processData' }))[0];

        const now = Date.now();
        expect(updatedJob.attrs.nextRunAt).not.toBeNull();
        expect(updatedJob.attrs.nextRunAt?.getTime()).toBeGreaterThan(now - 100);
      });

      test('should handle recurring jobs that started but have not finished', async () => {
        const job = globalPulseInstance.create('processData', { data: 'sample' });
        job.attrs.repeatInterval = '10 minutes';
        job.attrs.lockedAt = new Date();
        job.attrs.nextRunAt = new Date(Date.now() + 10000);
        await job.save();

        await globalPulseInstance.resumeOnRestart();

        const updatedJob = (await globalPulseInstance.jobs({ name: 'processData' }))[0];
        expect(updatedJob.attrs.lockedAt).not.toBeNull();
        expect(updatedJob.attrs.nextRunAt).not.toBeNull();
      });

      test('should handle interrupted recurring jobs after server recovery', async () => {
        const job = globalPulseInstance.create('processData', { data: 'sample' });
        job.attrs.repeatInterval = '5 minutes';
        job.attrs.lastModifiedBy = 'server_crash';
        job.attrs.nextRunAt = null;
        await job.save();

        await globalPulseInstance.resumeOnRestart();

        const updatedJob = (await globalPulseInstance.jobs({ name: 'processData' }))[0];
        expect(updatedJob.attrs.nextRunAt).not.toBeNull();
        expect(updatedJob.attrs.lastModifiedBy).not.toEqual('server_crash');
      });

      // test('should not modify non-recurring jobs with lastFinishedAt in the past', async () => {
      //   const job = globalPulseInstance.create('sendEmail', { to: 'user@example.com' });
      //   job.attrs.lastFinishedAt = new Date(Date.now() - 10000);
      //   await job.save();

      //   await globalPulseInstance.resumeOnRestart();

      //   const updatedJob = (await globalPulseInstance.jobs({ name: 'sendEmail' }))[0];
      //   expect(updatedJob.attrs.nextRunAt).toBeNull();
      // });

      test('should not skip queued recurring jobs while starting a new pulse instance in case of resumeOnRestart is disabled', async () => {
        await globalPulseInstance.stop();

        // Create a recurring job that is in queue and wasn't locked by any pulse instance
        const job = globalPulseInstance.create('processData', { data: 'sample' });
        job.attrs.repeatInterval = '10 minutes';
        job.attrs.lockedAt = null;
        job.attrs.nextRunAt = new Date(Date.now() - 10000);
        await job.save();

        // Starting a new pulse instance
        const newPulseInstance = new Pulse({ mongo: mongoDb, resumeOnRestart: false });
        newPulseInstance.define('processData', jobProcessor);
        await newPulseInstance.start();

        await delay(1000);
        const updatedJob = (await newPulseInstance.jobs({ name: 'processData' }))[0];
        expect(updatedJob.attrs.lastFinishedAt).toBeDefined();

        await newPulseInstance.stop();
      });
    });
  });

  describe('Test job methods', () => {
    describe('Test create method', () => {
      let job: any;
      beforeEach(() => {
        job = globalPulseInstance.create('sendEmail', { to: 'some guy' });
      });

      test('returns a job', () => {
        expect(job).toBeInstanceOf(Job);
      });
      test('sets the name', () => {
        expect(job.attrs.name).toEqual('sendEmail');
      });
      test('sets the type', () => {
        expect(job.attrs.type).toEqual('normal');
      });
      test('sets the pulse', () => {
        expect(job.pulse).toEqual(globalPulseInstance);
      });
      test('sets the data', () => {
        expect(job.attrs.data.to).toBe('some guy');
      });
    });

    describe('Test define method', () => {
      test('stores the definition for the job', () => {
        expect(globalPulseInstance._definitions.someJob.fn).toBe(jobProcessor);
      });
      describe('Test default options', () => {
        test('sets the default concurrency for the job', () => {
          expect(globalPulseInstance._definitions.someJob.concurrency).toBe(5);
        });
        test('sets the default lockLimit for the job', () => {
          expect(globalPulseInstance._definitions.someJob.lockLimit).toBe(0);
        });

        test('sets the default lockLifetime for the job', () => {
          expect(globalPulseInstance._definitions.someJob.lockLifetime).toBe(600000);
        });

        test('sets the default priority for the job', () => {
          expect(globalPulseInstance._definitions.someJob.priority).toBe(0);
        });

        test('sets the default attempts for the job', () => {
          expect(globalPulseInstance._definitions.someJob.attempts).toBe(0);
        });
      });

      describe('Test setting options', () => {
        test('sets the priority option for the job', () => {
          globalPulseInstance.define('highPriority', jobProcessor, { priority: 'high' });
          expect(globalPulseInstance._definitions.highPriority.priority).toBe('high');
        });

        test('sets shouldSaveResult option for the job', () => {
          globalPulseInstance.define('shouldSaveResultTrue', jobProcessor, { shouldSaveResult: true });
          expect(globalPulseInstance._definitions.shouldSaveResultTrue.shouldSaveResult).toBeTruthy();
        });

        test('sets attempts and backoff option for the job', () => {
          globalPulseInstance.define('attemptsAndBackoff', jobProcessor, {
            attempts: 5,
            backoff: { type: 'fixed', delay: 1000 },
          });
          expect(globalPulseInstance._definitions.attemptsAndBackoff.attempts).toBe(5);
          expect(globalPulseInstance._definitions.attemptsAndBackoff.backoff).toEqual({ type: 'fixed', delay: 1000 });
        });
      });
    });

    describe('Test every method', () => {
      describe('Test with a job name specified', () => {
        test('returns a job', async () => {
          expect(await globalPulseInstance.every('5 minutes', 'send email')).toBeInstanceOf(Job);
        });
        test('sets the repeatEvery', async () => {
          const result = (await globalPulseInstance.every('5 seconds', 'send email')) as Job;
          expect(result.attrs.repeatInterval).toEqual('5 seconds');
        });
        test('sets the pulse', async () => {
          const result = (await globalPulseInstance.every('5 seconds', 'send email')) as Job;
          expect(result.pulse).toEqual(globalPulseInstance);
        });
        test('should update a job that was previously scheduled with `every`', async () => {
          await globalPulseInstance.every('10', 'shouldBeSingleJob');
          await globalPulseInstance.every('20', 'shouldBeSingleJob');

          // Give the saves a little time to propagate
          await delay(jobTimeout);

          const res = await globalPulseInstance.jobs({ name: 'shouldBeSingleJob' });
          expect(res.length).toBe(1);
        });
        test('should not run immediately if options.skipImmediate is true', async () => {
          const jobName = 'send email';
          await globalPulseInstance.every('5 minutes', jobName, {}, { skipImmediate: true });
          const job = (await globalPulseInstance.jobs({ name: jobName }))[0] as Job;
          const nextRunAt = job.attrs.nextRunAt?.getTime() as number;
          const now = new Date().getTime();
          expect(nextRunAt - now > 0).toBe(true);
        });
        test('should run immediately if options.skipImmediate is false', async () => {
          const jobName = 'send email';
          await globalPulseInstance.every('5 minutes', jobName, {}, { skipImmediate: false });
          const job = (await globalPulseInstance.jobs({ name: jobName }))[0];
          const nextRunAt = job.attrs.nextRunAt?.getTime() as number;
          const now = new Date().getTime();
          expect(nextRunAt - now <= 0).toBe(true);
        });

        test('should update nextRunAt after running a recurring job', async () => {
          const job = globalPulseInstance.create('recurringJob', { data: 'test' });
          job.attrs.repeatInterval = '*/5 * * * *';
          await job.save();

          await job.run();

          expect(job.attrs.nextRunAt).not.toBeNull();
          expect(job.attrs.nextRunAt?.getTime()).toBeGreaterThan(Date.now());
        });
      });
      describe('Test with array of names specified', () => {
        test('returns array of jobs', async () => {
          const jobs = await globalPulseInstance.every('5 minutes', ['send email', 'some job']);
          expect(Array.isArray(jobs)).toBe(true);
        });
      });
    });

    describe('Test countJobs', () => {
      test('returns zero when there are no jobs', async () => {
        const count = await globalPulseInstance.countJobs();
        expect(count).toBe(0);
      });

      test('counts jobs correctly', async () => {
        const job1 = globalPulseInstance.create('testJob1', {});
        const job2 = globalPulseInstance.create('testJob2', {});
        await job1.save();
        await job2.save();

        const count = await globalPulseInstance.countJobs();
        expect(count).toBe(2);
      });

      test('counts jobs with query', async () => {
        const job1 = globalPulseInstance.create('testJob1', { type: 'email' });
        const job2 = globalPulseInstance.create('testJob2', { type: 'sms' });
        await job1.save();
        await job2.save();

        const count = await globalPulseInstance.countJobs({ 'data.type': 'email' });
        expect(count).toBe(1);
      });

      test('counts jobs with options', async () => {
        const job1 = globalPulseInstance.create('testJob1', { type: 'email' });
        const job2 = globalPulseInstance.create('testJob2', { type: 'sms' });
        await job1.save();
        await job2.save();

        const count = await globalPulseInstance.countJobs({}, { limit: 1 });
        expect(count).toBe(1);
      });
    });

    describe('Test schedule method', () => {
      test('creates and schedules a job', async () => {
        await globalPulseInstance.schedule('2024-06-03T10:00:00Z', 'sendEmail', { to: 'some guy' });
        const jobs = await globalPulseInstance.jobs({ name: 'sendEmail' });
        expect(jobs.length).toBe(1);
      });

      test('creates and schedules multiple jobs', async () => {
        await globalPulseInstance.schedule('2024-06-03T10:00:00Z', ['sendEmail', 'some job'], { to: 'some guy' });
        const jobs = await globalPulseInstance.jobs();
        expect(jobs.length).toBe(2);
      });

      test('checks if job is scheduled correctly', async () => {
        await globalPulseInstance.schedule('2024-06-03T10:00:00Z', 'sendEmail', { to: 'some guy' });
        const jobs = await globalPulseInstance.jobs({ name: 'sendEmail' });
        const job = jobs[0];
        expect(job.attrs.nextRunAt).toEqual(new Date('2024-06-03T10:00:00Z'));
      });
    });
  });
});
