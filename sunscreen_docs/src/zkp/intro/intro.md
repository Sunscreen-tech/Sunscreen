# Introduction to ZKPs and our compiler

ZKPs allow one to prove that a statement is correct
without revealing any information, other than the correctness of the
statement.

A simple real world example might involve Alice trying to convince Bob the bartender she's over 21 without revealing exactly how old she is.

### Why should I care about ZKPs?

At first, ZKPs may seem paradoxical or totally unrealistic but they are
already out in the wild and have become increasingly popular, particularly for
their ability to provide privacy in transparent systems. 

For example, in Ethereum, every transaction is recorded on a public blockchain. With ZKPs,
users can conduct private transactions (in which the transaction amount and their balance are hidden to outside parties) while only publishing proof of the validity of the transaction (e.g. user shows the hidden amount is less than their hidden balance, the hidden amount is greater than 0). An example of private transactions deployed in practice is [Zcash](https://z.cash/). ZKPs also enable other [use cases in the web3
setting][thirdweb], such as decentralized identity and EVM scalability (via
"zk-rollups").

While the above ZKP applications relate to the web3 space, there are interesting applications in web2 as well (e.g. Cloudflare's [attestation of personhood](https://blog.cloudflare.com/introducing-zero-knowledge-proofs-for-private-web-attestation-with-cross-multi-vendor-hardware/)).

[thirdweb]: https://blog.thirdweb.com/zero-knowledge-proof-zkp/#what-are-some-use-cases-for-zero-knowledge-proofs-zkps-on-the-blockchain
