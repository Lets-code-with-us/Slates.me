interface CodeSnippet {
  title: string;
  description: string;
  language: string;
  code: string;
}

// Common programming patterns and examples
export const codeSnippets: Record<string, CodeSnippet[]> = {
  python: [
    {
      title: "Hello World",
      description: "Basic print statement",
      language: "python",
      code: 'print("Hello, World!")'
    },
    {
      title: "For Loop",
      description: "Basic for loop pattern",
      language: "python",
      code: `for i in range(10):
    print(i)`
    },
    {
      title: "Function Definition",
      description: "Basic function with parameters",
      language: "python",
      code: `def greet(name):
    """Greet a person by name"""
    print(f"Hello, {name}!")`
    },
    {
      title: "Class Definition",
      description: "Basic class with constructor",
      language: "python",
      code: `class Person:
    def __init__(self, name, age):
        self.name = name
        self.age = age
    
    def greet(self):
        print(f"Hello, my name is {self.name}")`
    }
  ],
  javascript: [
    {
      title: "Console Log",
      description: "Basic console output",
      language: "javascript",
      code: 'console.log("Hello, World!");'
    },
    {
      title: "For Loop",
      description: "Basic for loop pattern",
      language: "javascript",
      code: `for (let i = 0; i < 10; i++) {
    console.log(i);
}`
    },
    {
      title: "Function Definition",
      description: "Basic function with parameters",
      language: "javascript",
      code: `function greet(name) {
    console.log(\`Hello, \${name}!\`);
}`
    },
    {
      title: "Class Definition",
      description: "Basic class with constructor",
      language: "javascript",
      code: `class Person {
    constructor(name, age) {
        this.name = name;
        this.age = age;
    }

    greet() {
        console.log(\`Hello, my name is \${this.name}\`);
    }
}`
    }
  ],
  java: [
    {
      title: "Main Method",
      description: "Basic Java program structure",
      language: "java",
      code: `public class Main {
    public static void main(String[] args) {
        System.out.println("Hello, World!");
    }
}`
    },
    {
      title: "For Loop",
      description: "Basic for loop pattern",
      language: "java",
      code: `for (int i = 0; i < 10; i++) {
    System.out.println(i);
}`
    },
    {
      title: "Method Definition",
      description: "Basic method with parameters",
      language: "java",
      code: `public String greet(String name) {
    return "Hello, " + name + "!";
}`
    },
    {
      title: "Class Definition",
      description: "Basic class with constructor",
      language: "java",
      code: `public class Person {
    private String name;
    private int age;

    public Person(String name, int age) {
        this.name = name;
        this.age = age;
    }

    public void greet() {
        System.out.println("Hello, my name is " + name);
    }
}`
    }
  ],
  cpp: [
    {
      title: "Main Function",
      description: "Basic C++ program structure",
      language: "cpp",
      code: `#include <iostream>

int main() {
    std::cout << "Hello, World!" << std::endl;
    return 0;
}`
    },
    {
      title: "For Loop",
      description: "Basic for loop pattern",
      language: "cpp",
      code: `for (int i = 0; i < 10; i++) {
    std::cout << i << std::endl;
}`
    },
    {
      title: "Function Definition",
      description: "Basic function with parameters",
      language: "cpp",
      code: `void greet(string name) {
    cout << "Hello, " << name << "!" << endl;
}`
    },
    {
      title: "Class Definition",
      description: "Basic class with constructor",
      language: "cpp",
      code: `class Person {
private:
    string name;
    int age;

public:
    Person(string n, int a) : name(n), age(a) {}

    void greet() {
        cout << "Hello, my name is " << name << endl;
    }
};`
    }
  ]
};