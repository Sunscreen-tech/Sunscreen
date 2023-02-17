import math

def compute_params(n, m, B, k, d, q):
    b = int(math.ceil(math.log2(B))) + 1
    b_1 = int(math.ceil(math.log2(m * d * B + d)))
    b_2 = int(math.ceil(math.log2(q)))

    print(f"b={b} b_1={b_1} b_2={b_2}")

    l = m * k * d * b + n * k * (2 * d - 1) * b_1 + n * k * (d - 1) * b_2

    return l

# Given a SDLP problem instance, compute l
n = 2
m = 4
B = 2 ** 18
k = 1

# SEAL q when d = 8192
d = 8192
q = 421249101157150430150591791601812858371395928330411389778873040897

print(f"SEAL params d={d} q={q} l={compute_params(n, m, B, k, d, q)}")

# SEAL when using d = 4096, but same q as 8192. This configuration
# is wildly insecure, but convenient for testing SDLP.
d = 4096
q = 421249101157150430150591791601812858371395928330411389778873040897

print(f"SEAL params d={d} q={q} l={compute_params(n, m, B, k, d, q)}")

# SEAL q when d = 4096
d = 4096
q = 649033470896967801447398927572993

print(f"SEAL params d={d} q={q} l={compute_params(n, m, B, k, d, q)}")

# SEAL q when d = 4096
d = 2048
q = 18014398492704769

print(f"SEAL params d={d} q={q} l={compute_params(n, m, B, k, d, q)}")

# SEAL q when d = 4096
d = 1024
q = 132120577

print(f"SEAL params d={d} q={q} l={compute_params(n, m, B, k, d, q)}")