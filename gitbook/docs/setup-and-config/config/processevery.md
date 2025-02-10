# ProcessEvery



## `pulse.processEvery(interval)`

{% hint style="info" %}
The `processEvery` method of the `Pulse` class allows to configure the job processing interval, meaning the frequency at which Pulse will query the database looking for jobs that need to be processed.
{% endhint %}

### Example Usage

```typescript
const pulse = new Pulse();

// Configure the job processing interval to every 10 minutes
pulse.processEvery('10 minutes');

//or new Pulse({ processEvery:'10 minutes' });
```



### Parameters

* **`interval`** (`string`): The interval at which to process jobs, expressed in a human-readable format, such as '5 minutes', '1 hour', etc.

### Returns

* **`Pulse`**: Returns the instance of the `Pulse` class, facilitating method chaining.

