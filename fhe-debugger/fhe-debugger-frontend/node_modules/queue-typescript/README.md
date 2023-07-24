# queue-typescript 
[![Build Status][travis-badge]][travis] [![Coverage Status][coveralls-badge]][coveralls]

Simple Typescript [Queue][wiki] with generics type templating and support for iterator 
and iterable protocols.

This queue uses the [linked-list-typescript][list] as the underlying datastructure.

See Also:
 - [linked-list-typescript][list]
 - [stack-typescript][stack]
 - [hashlist-typescript][hashlist]

## Installation

[npm][]:

```bash
npm install --save queue-typescript
```

[yarn][]:

```bash
yarn add queue-typescript
```

## Building from source

install dev dependencies. There are no production dependencies.

```bash
yarn
npm install
```

build using the options in `tsconfig.json`

```bash
yarn|npm run build
```

run all package tests

```bash
yarn|npm run test
```

see the test coverage report

```bash
yarn|npm run coverage
yarn|npm run coverage:report
```

## Usage

Importing:

```typescript
import { Queue } from 'queue-typescript';
const { Queue } = require('queue-typescript')
```

## API

### Queue<T>(...values: T[])

#### Queue<T>()

Create an empty queue by omitting any arguments during instantiation.

```typescript
let queue = new Queue<number>()
```

#### Queue<T>(...values: T[])

Create a new queue and initialize it with values. Values will be added from front
to back. i.e. the first argument will be at the front of the queue and the last 
argument will be at the back of the queue.

Specify the type using the typescript templating to enable type-checking of all
values going into and out of the queue.

```typescript
let items: number[] = [4, 5, 6, 7];
let queue = new Queue<number>(...items);
```

```typescript
let items: string[] = ['one', 'two', 'three', 'four'];
let queue = new Queue<string>(...items);
```

Typescript will check if the values match the type given to the template
when initializing the new queue.

```typescript
let items: = ['one', 'two', 'three', 4];
let queue = new Queue<string>(...items); // arguments are not all strings
```

#### Queue<Foo>(...values: Foo[])

Create a new queue using custom types or classes. All values are retained as references
and not copies so removed values can be compared using strict comparison.

```typescript
class Foo {
  private val:number;
  constructor(val: number) {
    this.val = val;
  }
  get bar(): number { return this.val }
}

let foo1 = new Foo(1);
let foo2 = new Foo(2);
let foo3 = new Foo(3);

let fooQueue = new Queue<Foo>(foo1, foo2, foo3)

fooQueue.front.bar // => 1
let val = queue.dequeue()
val // => foo1
```



#### Queue<any>(...values: any[])

Specify `any` to allow the queue to take values of any type.

```typescript
let queue = new Queue<any>(4, 'hello' { hello: 'world' })
queue.length // => 3
queue.front // => 4
```

#### Queue#[Symbol.iterator]

The queue supports both iterator and iterable protocols allowing it to be used
with the `for...of` and `...spread` operators and with deconstruction.

`for...of`:

```typescript
let items: number[] = [4, 5, 6];
let queue = new Queue<number>(...items);

for (let item of queue) {
  console.log(item)
}
//4
//5
//6
```

`...spread`:

```typescript
let items: number[] = [4, 5, 6];
let queue = new Queue<number>(...items);

function manyArgs(...args) {
  for (let i in args) {
    console.log(args[i])
  }
}
manyArgs(...queue);
//4
//5
//6
```

`deconstruction`:

```typescript
let items: number[] = [4, 5, 6, 7];
let queue = new Queue<number>(...items);

let [a, b, c] = queue;
//a => 4
//b => 5
//c => 6
```

#### Queue<T>#front :T

Peek at the front of the queue. This will not remove the value
from the queue.

```typescript
let items: number[] = [4, 5, 6, 7];
let queue = new Queue<number>(...items);
queue.front // => 4
```

#### Queue<T>#length :number

Query the length of the queue. An empty queue will return 0.

```typescript
let items: number[] = [4, 5, 6, 7];
let queue = new Queue<number>(...items);
queue.length // => 4
```

#### Queue<T>#enqueue(val: T): boolean

Enqueue an item at the back of the queue. The new item will replace the previous last item.

```typescript
let items: number[] = [4, 5, 6, 7];
let queue = new Queue<number>(...items);
queue.length // => 4
queue.enqueue(8)
queue.length // => 5
```

#### Queue<T>#dequeue(): T

Removes the item from the front of the queue and returns the item.

```typescript
let items: number[] = [4, 5, 6, 7];
let queue = new Queue<number>(...items);
queue.length // => 4
let val = queue.dequeue()
queue.length // => 3
queue.front // => 5
val // => 4
```

#### Queue<T>#toArray(): T[]

This method simply returns `[...this]`.

Converts the queue into an array and returns the array representation. This method does
not mutate the queue in any way.

Objects are not copied, so all non-primitive items in the array are still referencing
the queue items.

```typescript
let items: number[] = [4, 5, 6, 7];
let queue = new Queue<number>(...items);
let result = queue.toArray()
result // => [4, 5, 6, 7]
```

## License

[MIT][license] © [Michael Sutherland][author]

<!-- Definitions -->

[travis-badge]: https://img.shields.io/travis/sfkiwi/queue-typescript.svg

[travis]: https://travis-ci.org/sfkiwi/queue-typescript

[coveralls-badge]: https://img.shields.io/coveralls/github/sfkiwi/queue-typescript.svg

[coveralls]: https://coveralls.io/github/sfkiwi/queue-typescript

[npm]: https://docs.npmjs.com/cli/install

[yarn]: https://yarnpkg.com/lang/en/docs/install/

[license]: LICENSE.md

[author]: http://github.com/sfkiwi

[wiki]: https://en.wikipedia.org/wiki/Queue_(abstract_data_type)

[list]: https://www.npmjs.com/package/linked-list-typescript

[stack]: https://www.npmjs.com/package/stack-typescript

[queue]: https://www.npmjs.com/package/queue-typescript

[hashlist]: https://www.npmjs.com/package/hashlist-typescript
