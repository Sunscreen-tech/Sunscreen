p = 13
r = 16
rinv = (r**(p-2)) % p

p_inv = (p**(p-2)) % r
p_prime = (p_inv * (r - 1)) % r
print((p_inv * p) % r)

print((r * rinv) % p)

def to_mont(x):
	return (r * x) % p

def from_mont(x):
	return (x * rinv) % p

def mont_add(x, y):
	return (x + y) % p

def mont_mul(x, y):
	return (x * y * rinv) % p

def redc():
	pass

a = to_mont(5)
b = to_mont(6)


c = mont_mul(a, b)
d = mont_add(a, b)

print(from_mont(c), from_mont(d))

