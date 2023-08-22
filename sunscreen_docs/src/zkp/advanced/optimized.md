# Writing even better ZKP programs

In this section, we're going to cover a few techniques that allow you to get the most out of your ZKP programs.

Specifically, we'll look at:
- Creating gadgets to improve performance and be re-used across programs (gadgets also allow you to do stuff like division which isn't native to R1CS!)
- Using constant (instead of public) inputs to improve performance where possible
- Creating your own types for certain use cases
