# The Everlife Community Node Interface

This repository contains the current everlife community node interface
source code.

## Architecture

The Everlife Architecture splits each service off into it's own isolated
service and the services communicate with each other. This increases the
reliability and stability of the Everlife Avatar - no one system can
bring it down.

Unlike the server version this community node contains not only the
interface but also an embedded EverChain service. This is because it is
based of the wonderful [Patchwork](https://github.com/ssbc/patchwork/)
project which contains the embedded social blockchain technology that we
use.

