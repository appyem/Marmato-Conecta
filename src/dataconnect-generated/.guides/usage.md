# Basic Usage

Always prioritize using a supported framework over using the generated SDK
directly. Supported frameworks simplify the developer experience and help ensure
best practices are followed.




### React
For each operation, there is a wrapper hook that can be used to call the operation.

Here are all of the hooks that get generated:
```ts
import { useListAllVehicles, useGetCitizenProfile, useCreateInfraction, useRecordPayment } from '@dataconnect/generated/react';
// The types of these hooks are available in react/index.d.ts

const { data, isPending, isSuccess, isError, error } = useListAllVehicles();

const { data, isPending, isSuccess, isError, error } = useGetCitizenProfile(getCitizenProfileVars);

const { data, isPending, isSuccess, isError, error } = useCreateInfraction(createInfractionVars);

const { data, isPending, isSuccess, isError, error } = useRecordPayment(recordPaymentVars);

```

Here's an example from a different generated SDK:

```ts
import { useListAllMovies } from '@dataconnect/generated/react';

function MyComponent() {
  const { isLoading, data, error } = useListAllMovies();
  if(isLoading) {
    return <div>Loading...</div>
  }
  if(error) {
    return <div> An Error Occurred: {error} </div>
  }
}

// App.tsx
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import MyComponent from './my-component';

function App() {
  const queryClient = new QueryClient();
  return <QueryClientProvider client={queryClient}>
    <MyComponent />
  </QueryClientProvider>
}
```



## Advanced Usage
If a user is not using a supported framework, they can use the generated SDK directly.

Here's an example of how to use it with the first 5 operations:

```js
import { listAllVehicles, getCitizenProfile, createInfraction, recordPayment } from '@dataconnect/generated';


// Operation ListAllVehicles: 
const { data } = await ListAllVehicles(dataConnect);

// Operation GetCitizenProfile:  For variables, look at type GetCitizenProfileVars in ../index.d.ts
const { data } = await GetCitizenProfile(dataConnect, getCitizenProfileVars);

// Operation CreateInfraction:  For variables, look at type CreateInfractionVars in ../index.d.ts
const { data } = await CreateInfraction(dataConnect, createInfractionVars);

// Operation RecordPayment:  For variables, look at type RecordPaymentVars in ../index.d.ts
const { data } = await RecordPayment(dataConnect, recordPaymentVars);


```