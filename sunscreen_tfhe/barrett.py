import math
import sys

radix = 10

if len(sys.argv) < 3:
	print("Usage: barrett <number of 64-bit limbs> <modulus> [<modulus radix>]")

n = int(sys.argv[1])

if len(sys.argv) == 4:
	radix = int(sys.argv[3])

p = int(sys.argv[2], radix)

def compute_vals(n, p):
	r = math.floor(2**(64 * n) // p)
	s = math.floor(2**(128 * n) // p) - 2**(64 * n) * r
	t = 2**(64*n) - r * p

	return (n, r, s, t)

(_, r, s, t) = compute_vals(n, p)

def print_value(n, name, x):
	print(name + " = [")

	for i in range(n):
		print("  " + str((x >> (64 * i)) & 0xFFFFFFFFFFFFFFFF) + ",")

	print("]")

print_value(n, "r", r)
print_value(n, "s", s)
print_value(n, "t", t)
