# Limitations

A ZKP program with linked FHE inputs has the [same
limitations](/zkp/zkp_programs/limitations.md) as unlinked ZKP programs.

However, keep in mind that when your ZKP program function takes in a linked
input argument, what you can do with that argument is restricted based on its
type. In particular, these types don't directly support
[arithmetic](/zkp/zkp_programs/types.md#native-field-elements) nor
[constraints](/zkp/zkp_programs/constraints.md#constraints) like native field
elements do. To perform these operations, you must first convert the linked
inputs into field elements, as we saw repeatedly in the last section.
