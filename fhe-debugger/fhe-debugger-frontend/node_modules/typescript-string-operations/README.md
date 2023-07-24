
[![CircleCI](https://circleci.com/gh/sevensc/typescript-string-operations.svg?style=shield)](https://app.circleci.com/pipelines/github/sevensc/typescript-string-operations)
[![Quality Gate Status](https://sonarcloud.io/api/project_badges/measure?project=sevensc_typescript-string-operations&metric=alert_status)](https://sonarcloud.io/dashboard?id=sevensc_typescript-string-operations)
![npm](https://img.shields.io/npm/v/typescript-string-operations)
![npm](https://img.shields.io/npm/dw/typescript-string-operations)


# Simple lightweight string operation library for Typescript.
## No jQuery required! Unit tested, works with Angular.


```typescript
 import { StringBuilder, join, format, isNullOrWhiteSpace } from 'typescript-string-operations';
 ```
 
When migrating from Version 1.4.1 or lower, you can also import the class `String`. Using this String class would override the native `String` object from JavaScript. We will remove this declaration with the next major release

```typescript
 import { String } from 'typescript-string-operations';
```

#### USAGE:

### String.empty
```typescript
var id = emptyString; // or String.empty
// output: id = '';
```

### String.isNullOrWhiteSpace():
```typescript
var id = image.GetId();
if(isNullOrWhiteSpace(id)) // String.isNullOrWhiteSpace(id)
	return image;
```
### String.format():

```typescript
var id = image.GetId()
formatString("image_{0}.jpg", id) // or String.format()
output: "image_2db5da20-1c5d-4f1a-8fd4-b41e34c8c5b5.jpg";
```

Specifier available!
```typescript
var value = formatString("{0:L}", "APPLE"); //output "apple"

value = formatString("{0:U}", "apple"); // output "APPLE"

value = formatString("{0:d}", "2017-01-23 00:00"); //output "23.01.2017"

value = formatString("{0:s}", "21.03.2017 22:15:01") //output "2017-03-21T22:15:01"

value = formatString("{0:n}", 1000000);
//output "1.000.000"

value = formatString("{0:00}", 1);
//output "01"
```

## UPDATE
#### String.format for Objects including specifiers

```typescript
var fruit = new Fruit();
fruit.type = "apple";
fruit.color = "RED";
fruit.shippingDate = new Date(2018, 1, 1);
fruit.amount = 10000;

format("the {type:U} is {color:L} shipped on {shippingDate:s} with an amount of {amount:n}", fruit);
// output: the APPLE is red shipped on 2018-01-01 with an amount of 10.000

```


|	Specifier	  |	 			Result 	   	    |
| :-------------: |:---------------------------:|
|		`L`		  |	LowerCase					|
|		`U`		  |	UpperCase					|
|		`d`		  |	ShortDatePattern			|
|		`s`		  |	SortableDateTimePattern		|
|		`n`		  |	Thousand seperator			|
|		`00`	  |	Padding numbers				|



### String.join():

```typescript
var value = joinString("; ", "Apple", "Banana"); // or String.join()
//output: "Apple; Banana";
```
#### OR

```typescript
 let object = { Name: "Foo", Value: "Bar" };
 var value = joinString('.', object);
//output: "Foo.Bar";

var array = ['Apple', 'Banana']
var value = joinString("; ", array);
//output: "Apple; Banana";
```

## Methods

| Method                    |  Type       |       Description          | Parameter  |
| :------------------------:|:-----------:|:--------------------------:|:----------:|
|  `empty`                  | `Property`  |    simply returns `""`.    |
| `isNullOrWhiteSpace`      | `Method`    | returns true value if given parameter is either null, empty or undefined. | `format`, `...args`
| `format`/`formatString`   | `Method`    | Converts the value of objects to strings based on the formats specified and inserts them into another string. | `format`, `...args`
| `join`/`joinString`       | `Method`    |   Combines arguments delimited by given seperator.| `delimiter`,`...args`
| `join`/`joinString`       | `Method`    |   Combines arguments delimited by given seperator from array. | `delimiter`,`array` |


### StringBuilder

Just like you know from C#,


```typescript

var favoriteFruit: string = this.fruitService.getFavorite(); //Blueberries

var builder = new StringBuilder("My favorite fruits are: ");
builder.Append("Apples, ");
builder.Append("Bananas ");

// using String.format() internally
builder.AppendFormat("and especially {0:U}!", favoriteFruit);
builder.AppendFormat(" I eat {0} every day!", 10);

var fruits = builder.ToString();

//output: "My favorite fruits are: Apples, Bananas and especially BLUEBERRIES! I eat 10 every day!";

```
## Methods

| Method                    |  Type       |       Description          | Parameter  |
| :------------------------:|:-----------:|:--------------------------:|:----------:|
|  `Append`                 | `Method`    |    appends a string.       | `value`    |
|  `AppendFormat`           | `Method`    |    see description for `format()`| `format`, `args`|
|  `AppendLine`             | `Method`    |    appends a string in a new line. | `format`, `args`|
|  `AppendLineFormat`       | `Method`    |    like `format()` in a new line | `format`, `args`|
|  `Clear`		            | `Method`    |    clears the `StringBuilder`   |       |
|  `ToString`	            | `Method`    |    creates the actual string.  |       |