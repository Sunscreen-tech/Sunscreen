This document describes how to generalize scheme switching presented in Micheli et al. to the GLWE setting. In their paper, the authors describe an efficient algorithm for taking a GadgetRLWE (i.e. RLEV) ciphertext and producing an RGSW ciphertext. We generalize the algorithm to allow taking a GLEV ciphertext and producing a GGSW ciphertext.

# Background
Let $\mathcal{R}=\mathbb{Z_q}[X]/(X^N+1)$ for power of two $N$.

Recall that $\mathsf{GLEV}_{\vec{s}}(m)=[ \mathsf{GLWE}(\frac{q}{\beta^1}m), \mathsf{GLWE}(\frac{q}{\beta^2}m), ..., \mathsf{GLWE}(\frac{q}{\beta^\ell}m) ]$ where $\beta$ and $\ell$ are scheme parameters that define a radix decomposition.

Furthermore, recall the gadget product $\odot$ between $a \in \mathcal{R}$ and $\mathsf{GLEV}(m)$:

$$
a \odot \mathsf{GLEV}(m):=\sum_{i=0}^{\ell-1}\mathsf{Decomp}_{i, \beta}(a)\times\mathsf{GLWE}(\frac{q}{\beta^{i+1}}m)
$$
$$
\approx\mathsf{GLWE}(am)
$$

# Scheme switching
## Keygen
Given a GLWE scheme with poly degree $N$ and GLWE size $k$ and secret key $\vec{s}$, define a scheme switching key as follows:

* Let $\mathbf{sk} = \vec{s} \otimes \vec{s}$
* Compute scheme switching key $\mathbf{s_{ss}}$ where $\mathbf{s_{ss}}^{i,j}=\mathsf{GLEV_{\vec{s}}}(\mathbf{sk}_{i,j})$ for $i, j\in [0, k)$.
* Observe that since $\mathbf{sk_{i,j}}=\mathbf{sk_{j, i}}$, we can reduce our keysize by roughly half. Simply store $s_{ss}^{i,j}$ using standard symmetric matrix compression.

## Algorithm
### First, an observation
Suppose we have $(\vec{a}, b) = \mathsf{GLWE}(m)$. Construct trivial GLWE ciphertext $t$ by placing $b$ in the $p$'th place in the basis coefficients and 0 elsewhere $t_p(b)=((0, ..., b, ... 0), 0)$. Observe what happens if we decrypt $t_p(b)$ under any key $\vec{s}$:

$$
m = (\sum_{i \ne p}^{[0, k)}0\cdot s_i + b \cdot s_p) - 0
$$

$$
= b \cdot s_p
$$

Since the error is 0 as well, we can elide the rounding step. Thus, $t$ is a $\mathsf{GLWE}$ encryption of $b \cdot s_p$ under $\vec{s}$.

### Our regularly scheduled program
Given $x=\mathsf{GLEV}(m)$, we have $x_i=\mathsf{GLWE}(\frac{q}{\beta^{i+1}}m)=(\vec{a}^{(i)}, b^{(i)}), i\in[0,\ell_{ggsw})$.

For each $i \in [0, \ell_{ggsw}), j \in [0, k)$ compute using $\mathsf{s_{ss}}^{j,m}$

$$
y_{i, j}=t_j(b^{(i)}) + \sum_{m=0}^{k-1} a^{(i)}_m \odot \mathsf{GLEV}_{\vec{s}}(s_j \cdot s_m)=\mathsf{GLWE}_{\vec{s}}(\sum_{m=0}^{k-1}a^{(i)}_m \cdot s_m \cdot s_j + b^{(i)}\cdot s_j)
$$
$$
=\mathsf{GLWE}_{\vec{s}}((\sum_{m=0}^{k-1}a^{(i)}_m \cdot s_m + b^{(i)})\cdot s_j)
$$
$$
=\mathsf{GLWE}_{\vec{s}}(\frac{q}{\beta^{i+1}}\cdot m \cdot s_j + e_i \cdot s_j)
$$

Note the $e_i$ term is small if $s_j$ is small (i.e. binary), and thus we are left with encryptions of $s_j \cdot m$

Further note, the radix decomposition in the above $\odot$ is $\beta_{ss}, \ell_{ss}$, which may be distinct from $(\beta_{ggsw}, \ell_{ggsw})$

Let $z_j=\mathsf{GLEV}_{\vec{s}}(m \cdot s_j)=(y_{0,j}, y_{1,j}, ..., y_{\ell_{ggsw}-1, j})$

Output $\mathsf{GGSW}_{\vec{s}}(m)=(z_0, z_1, ..., z_{k-1}, x)$