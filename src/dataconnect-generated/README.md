# Generated TypeScript README
This README will guide you through the process of using the generated JavaScript SDK package for the connector `example`. It will also provide examples on how to use your generated SDK to call your Data Connect queries and mutations.

**If you're looking for the `React README`, you can find it at [`dataconnect-generated/react/README.md`](./react/README.md)**

***NOTE:** This README is generated alongside the generated SDK. If you make changes to this file, they will be overwritten when the SDK is regenerated.*

# Table of Contents
- [**Overview**](#generated-javascript-readme)
- [**Accessing the connector**](#accessing-the-connector)
  - [*Connecting to the local Emulator*](#connecting-to-the-local-emulator)
- [**Queries**](#queries)
  - [*ListAllVehicles*](#listallvehicles)
  - [*GetCitizenProfile*](#getcitizenprofile)
- [**Mutations**](#mutations)
  - [*CreateInfraction*](#createinfraction)
  - [*RecordPayment*](#recordpayment)

# Accessing the connector
A connector is a collection of Queries and Mutations. One SDK is generated for each connector - this SDK is generated for the connector `example`. You can find more information about connectors in the [Data Connect documentation](https://firebase.google.com/docs/data-connect#how-does).

You can use this generated SDK by importing from the package `@dataconnect/generated` as shown below. Both CommonJS and ESM imports are supported.

You can also follow the instructions from the [Data Connect documentation](https://firebase.google.com/docs/data-connect/web-sdk#set-client).

```typescript
import { getDataConnect } from 'firebase/data-connect';
import { connectorConfig } from '@dataconnect/generated';

const dataConnect = getDataConnect(connectorConfig);
```

## Connecting to the local Emulator
By default, the connector will connect to the production service.

To connect to the emulator, you can use the following code.
You can also follow the emulator instructions from the [Data Connect documentation](https://firebase.google.com/docs/data-connect/web-sdk#instrument-clients).

```typescript
import { connectDataConnectEmulator, getDataConnect } from 'firebase/data-connect';
import { connectorConfig } from '@dataconnect/generated';

const dataConnect = getDataConnect(connectorConfig);
connectDataConnectEmulator(dataConnect, 'localhost', 9399);
```

After it's initialized, you can call your Data Connect [queries](#queries) and [mutations](#mutations) from your generated SDK.

# Queries

There are two ways to execute a Data Connect Query using the generated Web SDK:
- Using a Query Reference function, which returns a `QueryRef`
  - The `QueryRef` can be used as an argument to `executeQuery()`, which will execute the Query and return a `QueryPromise`
- Using an action shortcut function, which returns a `QueryPromise`
  - Calling the action shortcut function will execute the Query and return a `QueryPromise`

The following is true for both the action shortcut function and the `QueryRef` function:
- The `QueryPromise` returned will resolve to the result of the Query once it has finished executing
- If the Query accepts arguments, both the action shortcut function and the `QueryRef` function accept a single argument: an object that contains all the required variables (and the optional variables) for the Query
- Both functions can be called with or without passing in a `DataConnect` instance as an argument. If no `DataConnect` argument is passed in, then the generated SDK will call `getDataConnect(connectorConfig)` behind the scenes for you.

Below are examples of how to use the `example` connector's generated functions to execute each query. You can also follow the examples from the [Data Connect documentation](https://firebase.google.com/docs/data-connect/web-sdk#using-queries).

## ListAllVehicles
You can execute the `ListAllVehicles` query using the following action shortcut function, or by calling `executeQuery()` after calling the following `QueryRef` function, both of which are defined in [dataconnect-generated/index.d.ts](./index.d.ts):
```typescript
listAllVehicles(options?: ExecuteQueryOptions): QueryPromise<ListAllVehiclesData, undefined>;

interface ListAllVehiclesRef {
  ...
  /* Allow users to create refs without passing in DataConnect */
  (): QueryRef<ListAllVehiclesData, undefined>;
}
export const listAllVehiclesRef: ListAllVehiclesRef;
```
You can also pass in a `DataConnect` instance to the action shortcut function or `QueryRef` function.
```typescript
listAllVehicles(dc: DataConnect, options?: ExecuteQueryOptions): QueryPromise<ListAllVehiclesData, undefined>;

interface ListAllVehiclesRef {
  ...
  (dc: DataConnect): QueryRef<ListAllVehiclesData, undefined>;
}
export const listAllVehiclesRef: ListAllVehiclesRef;
```

If you need the name of the operation without creating a ref, you can retrieve the operation name by calling the `operationName` property on the listAllVehiclesRef:
```typescript
const name = listAllVehiclesRef.operationName;
console.log(name);
```

### Variables
The `ListAllVehicles` query has no variables.
### Return Type
Recall that executing the `ListAllVehicles` query returns a `QueryPromise` that resolves to an object with a `data` property.

The `data` property is an object of type `ListAllVehiclesData`, which is defined in [dataconnect-generated/index.d.ts](./index.d.ts). It has the following fields:
```typescript
export interface ListAllVehiclesData {
  vehicles: ({
    id: UUIDString;
    licensePlate: string;
    make: string;
    model: string;
    year: number;
    color?: string | null;
    vin?: string | null;
    owner?: {
      firstName: string;
      lastName: string;
    };
  } & Vehicle_Key)[];
}
```
### Using `ListAllVehicles`'s action shortcut function

```typescript
import { getDataConnect } from 'firebase/data-connect';
import { connectorConfig, listAllVehicles } from '@dataconnect/generated';


// Call the `listAllVehicles()` function to execute the query.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await listAllVehicles();

// You can also pass in a `DataConnect` instance to the action shortcut function.
const dataConnect = getDataConnect(connectorConfig);
const { data } = await listAllVehicles(dataConnect);

console.log(data.vehicles);

// Or, you can use the `Promise` API.
listAllVehicles().then((response) => {
  const data = response.data;
  console.log(data.vehicles);
});
```

### Using `ListAllVehicles`'s `QueryRef` function

```typescript
import { getDataConnect, executeQuery } from 'firebase/data-connect';
import { connectorConfig, listAllVehiclesRef } from '@dataconnect/generated';


// Call the `listAllVehiclesRef()` function to get a reference to the query.
const ref = listAllVehiclesRef();

// You can also pass in a `DataConnect` instance to the `QueryRef` function.
const dataConnect = getDataConnect(connectorConfig);
const ref = listAllVehiclesRef(dataConnect);

// Call `executeQuery()` on the reference to execute the query.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await executeQuery(ref);

console.log(data.vehicles);

// Or, you can use the `Promise` API.
executeQuery(ref).then((response) => {
  const data = response.data;
  console.log(data.vehicles);
});
```

## GetCitizenProfile
You can execute the `GetCitizenProfile` query using the following action shortcut function, or by calling `executeQuery()` after calling the following `QueryRef` function, both of which are defined in [dataconnect-generated/index.d.ts](./index.d.ts):
```typescript
getCitizenProfile(vars: GetCitizenProfileVariables, options?: ExecuteQueryOptions): QueryPromise<GetCitizenProfileData, GetCitizenProfileVariables>;

interface GetCitizenProfileRef {
  ...
  /* Allow users to create refs without passing in DataConnect */
  (vars: GetCitizenProfileVariables): QueryRef<GetCitizenProfileData, GetCitizenProfileVariables>;
}
export const getCitizenProfileRef: GetCitizenProfileRef;
```
You can also pass in a `DataConnect` instance to the action shortcut function or `QueryRef` function.
```typescript
getCitizenProfile(dc: DataConnect, vars: GetCitizenProfileVariables, options?: ExecuteQueryOptions): QueryPromise<GetCitizenProfileData, GetCitizenProfileVariables>;

interface GetCitizenProfileRef {
  ...
  (dc: DataConnect, vars: GetCitizenProfileVariables): QueryRef<GetCitizenProfileData, GetCitizenProfileVariables>;
}
export const getCitizenProfileRef: GetCitizenProfileRef;
```

If you need the name of the operation without creating a ref, you can retrieve the operation name by calling the `operationName` property on the getCitizenProfileRef:
```typescript
const name = getCitizenProfileRef.operationName;
console.log(name);
```

### Variables
The `GetCitizenProfile` query requires an argument of type `GetCitizenProfileVariables`, which is defined in [dataconnect-generated/index.d.ts](./index.d.ts). It has the following fields:

```typescript
export interface GetCitizenProfileVariables {
  citizenId: UUIDString;
}
```
### Return Type
Recall that executing the `GetCitizenProfile` query returns a `QueryPromise` that resolves to an object with a `data` property.

The `data` property is an object of type `GetCitizenProfileData`, which is defined in [dataconnect-generated/index.d.ts](./index.d.ts). It has the following fields:
```typescript
export interface GetCitizenProfileData {
  citizen?: {
    id: UUIDString;
    firstName: string;
    lastName: string;
    documentId: string;
    address?: string | null;
    phoneNumber?: string | null;
    email?: string | null;
    createdAt: TimestampString;
    vehicles_on_owner: ({
      id: UUIDString;
      licensePlate: string;
      make: string;
      model: string;
      year: number;
    } & Vehicle_Key)[];
      payments_on_citizen: ({
        id: UUIDString;
        amount: number;
        datePaid: TimestampString;
        method: string;
      } & Payment_Key)[];
  } & Citizen_Key;
}
```
### Using `GetCitizenProfile`'s action shortcut function

```typescript
import { getDataConnect } from 'firebase/data-connect';
import { connectorConfig, getCitizenProfile, GetCitizenProfileVariables } from '@dataconnect/generated';

// The `GetCitizenProfile` query requires an argument of type `GetCitizenProfileVariables`:
const getCitizenProfileVars: GetCitizenProfileVariables = {
  citizenId: ..., 
};

// Call the `getCitizenProfile()` function to execute the query.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await getCitizenProfile(getCitizenProfileVars);
// Variables can be defined inline as well.
const { data } = await getCitizenProfile({ citizenId: ..., });

// You can also pass in a `DataConnect` instance to the action shortcut function.
const dataConnect = getDataConnect(connectorConfig);
const { data } = await getCitizenProfile(dataConnect, getCitizenProfileVars);

console.log(data.citizen);

// Or, you can use the `Promise` API.
getCitizenProfile(getCitizenProfileVars).then((response) => {
  const data = response.data;
  console.log(data.citizen);
});
```

### Using `GetCitizenProfile`'s `QueryRef` function

```typescript
import { getDataConnect, executeQuery } from 'firebase/data-connect';
import { connectorConfig, getCitizenProfileRef, GetCitizenProfileVariables } from '@dataconnect/generated';

// The `GetCitizenProfile` query requires an argument of type `GetCitizenProfileVariables`:
const getCitizenProfileVars: GetCitizenProfileVariables = {
  citizenId: ..., 
};

// Call the `getCitizenProfileRef()` function to get a reference to the query.
const ref = getCitizenProfileRef(getCitizenProfileVars);
// Variables can be defined inline as well.
const ref = getCitizenProfileRef({ citizenId: ..., });

// You can also pass in a `DataConnect` instance to the `QueryRef` function.
const dataConnect = getDataConnect(connectorConfig);
const ref = getCitizenProfileRef(dataConnect, getCitizenProfileVars);

// Call `executeQuery()` on the reference to execute the query.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await executeQuery(ref);

console.log(data.citizen);

// Or, you can use the `Promise` API.
executeQuery(ref).then((response) => {
  const data = response.data;
  console.log(data.citizen);
});
```

# Mutations

There are two ways to execute a Data Connect Mutation using the generated Web SDK:
- Using a Mutation Reference function, which returns a `MutationRef`
  - The `MutationRef` can be used as an argument to `executeMutation()`, which will execute the Mutation and return a `MutationPromise`
- Using an action shortcut function, which returns a `MutationPromise`
  - Calling the action shortcut function will execute the Mutation and return a `MutationPromise`

The following is true for both the action shortcut function and the `MutationRef` function:
- The `MutationPromise` returned will resolve to the result of the Mutation once it has finished executing
- If the Mutation accepts arguments, both the action shortcut function and the `MutationRef` function accept a single argument: an object that contains all the required variables (and the optional variables) for the Mutation
- Both functions can be called with or without passing in a `DataConnect` instance as an argument. If no `DataConnect` argument is passed in, then the generated SDK will call `getDataConnect(connectorConfig)` behind the scenes for you.

Below are examples of how to use the `example` connector's generated functions to execute each mutation. You can also follow the examples from the [Data Connect documentation](https://firebase.google.com/docs/data-connect/web-sdk#using-mutations).

## CreateInfraction
You can execute the `CreateInfraction` mutation using the following action shortcut function, or by calling `executeMutation()` after calling the following `MutationRef` function, both of which are defined in [dataconnect-generated/index.d.ts](./index.d.ts):
```typescript
createInfraction(vars: CreateInfractionVariables): MutationPromise<CreateInfractionData, CreateInfractionVariables>;

interface CreateInfractionRef {
  ...
  /* Allow users to create refs without passing in DataConnect */
  (vars: CreateInfractionVariables): MutationRef<CreateInfractionData, CreateInfractionVariables>;
}
export const createInfractionRef: CreateInfractionRef;
```
You can also pass in a `DataConnect` instance to the action shortcut function or `MutationRef` function.
```typescript
createInfraction(dc: DataConnect, vars: CreateInfractionVariables): MutationPromise<CreateInfractionData, CreateInfractionVariables>;

interface CreateInfractionRef {
  ...
  (dc: DataConnect, vars: CreateInfractionVariables): MutationRef<CreateInfractionData, CreateInfractionVariables>;
}
export const createInfractionRef: CreateInfractionRef;
```

If you need the name of the operation without creating a ref, you can retrieve the operation name by calling the `operationName` property on the createInfractionRef:
```typescript
const name = createInfractionRef.operationName;
console.log(name);
```

### Variables
The `CreateInfraction` mutation requires an argument of type `CreateInfractionVariables`, which is defined in [dataconnect-generated/index.d.ts](./index.d.ts). It has the following fields:

```typescript
export interface CreateInfractionVariables {
  type: string;
  dateIssued: TimestampString;
  amount: number;
  status: string;
  vehicleId?: UUIDString | null;
}
```
### Return Type
Recall that executing the `CreateInfraction` mutation returns a `MutationPromise` that resolves to an object with a `data` property.

The `data` property is an object of type `CreateInfractionData`, which is defined in [dataconnect-generated/index.d.ts](./index.d.ts). It has the following fields:
```typescript
export interface CreateInfractionData {
  infraction_insert: Infraction_Key;
}
```
### Using `CreateInfraction`'s action shortcut function

```typescript
import { getDataConnect } from 'firebase/data-connect';
import { connectorConfig, createInfraction, CreateInfractionVariables } from '@dataconnect/generated';

// The `CreateInfraction` mutation requires an argument of type `CreateInfractionVariables`:
const createInfractionVars: CreateInfractionVariables = {
  type: ..., 
  dateIssued: ..., 
  amount: ..., 
  status: ..., 
  vehicleId: ..., // optional
};

// Call the `createInfraction()` function to execute the mutation.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await createInfraction(createInfractionVars);
// Variables can be defined inline as well.
const { data } = await createInfraction({ type: ..., dateIssued: ..., amount: ..., status: ..., vehicleId: ..., });

// You can also pass in a `DataConnect` instance to the action shortcut function.
const dataConnect = getDataConnect(connectorConfig);
const { data } = await createInfraction(dataConnect, createInfractionVars);

console.log(data.infraction_insert);

// Or, you can use the `Promise` API.
createInfraction(createInfractionVars).then((response) => {
  const data = response.data;
  console.log(data.infraction_insert);
});
```

### Using `CreateInfraction`'s `MutationRef` function

```typescript
import { getDataConnect, executeMutation } from 'firebase/data-connect';
import { connectorConfig, createInfractionRef, CreateInfractionVariables } from '@dataconnect/generated';

// The `CreateInfraction` mutation requires an argument of type `CreateInfractionVariables`:
const createInfractionVars: CreateInfractionVariables = {
  type: ..., 
  dateIssued: ..., 
  amount: ..., 
  status: ..., 
  vehicleId: ..., // optional
};

// Call the `createInfractionRef()` function to get a reference to the mutation.
const ref = createInfractionRef(createInfractionVars);
// Variables can be defined inline as well.
const ref = createInfractionRef({ type: ..., dateIssued: ..., amount: ..., status: ..., vehicleId: ..., });

// You can also pass in a `DataConnect` instance to the `MutationRef` function.
const dataConnect = getDataConnect(connectorConfig);
const ref = createInfractionRef(dataConnect, createInfractionVars);

// Call `executeMutation()` on the reference to execute the mutation.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await executeMutation(ref);

console.log(data.infraction_insert);

// Or, you can use the `Promise` API.
executeMutation(ref).then((response) => {
  const data = response.data;
  console.log(data.infraction_insert);
});
```

## RecordPayment
You can execute the `RecordPayment` mutation using the following action shortcut function, or by calling `executeMutation()` after calling the following `MutationRef` function, both of which are defined in [dataconnect-generated/index.d.ts](./index.d.ts):
```typescript
recordPayment(vars: RecordPaymentVariables): MutationPromise<RecordPaymentData, RecordPaymentVariables>;

interface RecordPaymentRef {
  ...
  /* Allow users to create refs without passing in DataConnect */
  (vars: RecordPaymentVariables): MutationRef<RecordPaymentData, RecordPaymentVariables>;
}
export const recordPaymentRef: RecordPaymentRef;
```
You can also pass in a `DataConnect` instance to the action shortcut function or `MutationRef` function.
```typescript
recordPayment(dc: DataConnect, vars: RecordPaymentVariables): MutationPromise<RecordPaymentData, RecordPaymentVariables>;

interface RecordPaymentRef {
  ...
  (dc: DataConnect, vars: RecordPaymentVariables): MutationRef<RecordPaymentData, RecordPaymentVariables>;
}
export const recordPaymentRef: RecordPaymentRef;
```

If you need the name of the operation without creating a ref, you can retrieve the operation name by calling the `operationName` property on the recordPaymentRef:
```typescript
const name = recordPaymentRef.operationName;
console.log(name);
```

### Variables
The `RecordPayment` mutation requires an argument of type `RecordPaymentVariables`, which is defined in [dataconnect-generated/index.d.ts](./index.d.ts). It has the following fields:

```typescript
export interface RecordPaymentVariables {
  amount: number;
  datePaid: TimestampString;
  method: string;
  citizenId?: UUIDString | null;
  infractionId?: UUIDString | null;
  campaignId?: UUIDString | null;
}
```
### Return Type
Recall that executing the `RecordPayment` mutation returns a `MutationPromise` that resolves to an object with a `data` property.

The `data` property is an object of type `RecordPaymentData`, which is defined in [dataconnect-generated/index.d.ts](./index.d.ts). It has the following fields:
```typescript
export interface RecordPaymentData {
  payment_insert: Payment_Key;
}
```
### Using `RecordPayment`'s action shortcut function

```typescript
import { getDataConnect } from 'firebase/data-connect';
import { connectorConfig, recordPayment, RecordPaymentVariables } from '@dataconnect/generated';

// The `RecordPayment` mutation requires an argument of type `RecordPaymentVariables`:
const recordPaymentVars: RecordPaymentVariables = {
  amount: ..., 
  datePaid: ..., 
  method: ..., 
  citizenId: ..., // optional
  infractionId: ..., // optional
  campaignId: ..., // optional
};

// Call the `recordPayment()` function to execute the mutation.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await recordPayment(recordPaymentVars);
// Variables can be defined inline as well.
const { data } = await recordPayment({ amount: ..., datePaid: ..., method: ..., citizenId: ..., infractionId: ..., campaignId: ..., });

// You can also pass in a `DataConnect` instance to the action shortcut function.
const dataConnect = getDataConnect(connectorConfig);
const { data } = await recordPayment(dataConnect, recordPaymentVars);

console.log(data.payment_insert);

// Or, you can use the `Promise` API.
recordPayment(recordPaymentVars).then((response) => {
  const data = response.data;
  console.log(data.payment_insert);
});
```

### Using `RecordPayment`'s `MutationRef` function

```typescript
import { getDataConnect, executeMutation } from 'firebase/data-connect';
import { connectorConfig, recordPaymentRef, RecordPaymentVariables } from '@dataconnect/generated';

// The `RecordPayment` mutation requires an argument of type `RecordPaymentVariables`:
const recordPaymentVars: RecordPaymentVariables = {
  amount: ..., 
  datePaid: ..., 
  method: ..., 
  citizenId: ..., // optional
  infractionId: ..., // optional
  campaignId: ..., // optional
};

// Call the `recordPaymentRef()` function to get a reference to the mutation.
const ref = recordPaymentRef(recordPaymentVars);
// Variables can be defined inline as well.
const ref = recordPaymentRef({ amount: ..., datePaid: ..., method: ..., citizenId: ..., infractionId: ..., campaignId: ..., });

// You can also pass in a `DataConnect` instance to the `MutationRef` function.
const dataConnect = getDataConnect(connectorConfig);
const ref = recordPaymentRef(dataConnect, recordPaymentVars);

// Call `executeMutation()` on the reference to execute the mutation.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await executeMutation(ref);

console.log(data.payment_insert);

// Or, you can use the `Promise` API.
executeMutation(ref).then((response) => {
  const data = response.data;
  console.log(data.payment_insert);
});
```

