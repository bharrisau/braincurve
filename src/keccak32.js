/* keccak32.js
 * Implements the final version of keccak[256, 544, 0] submitted to NIST,
 * truncated to 256 bits and acting on UTF-16LE strings.
 *
 * The following test vectors are given on the Keccak NIST CD:
 *     ShortMsgKAT_r256c544.txt
 *         Len = 0
 *         Msg = 00
 *         Squeezed = 2507DC4976767ADD735F22C1831FBF323CB9F94755C289A680B327ADFF881FCD5D9B3816314C55AB80881001B833C5BD02E8AC5359B07C27ACDFBB64ABE8738451AA7049
 *         ...
 *         Len = 16
 *         Msg = 41FB
 *         Squeezed = DCCDEF818CEEFE1CB20AF60AAFBF836D889462AC1A1BCEB756648B6B5CAE991B2C7C8976BA791CB69E8254ADAE50FD7A0F0AADB2546A45C55F7824EBD4A48998C09A69E7
 *         ...
 *         Len = 2000
 *         Msg = B3C5E74B69933C2533106C563B4CA20238F2B6E675E8681E34A389894785BDADE59652D4A73D80A5C85BD454FD1E9FFDAD1C3815F5038E9EF432AAC5C3C4FE840CC370CF86580A6011778BBEDAF511A51B56D1A2EB68394AA299E26DA9ADA6A2F39B9FAFF7FBA457689B9C1A577B2A1E505FDF75C7A0A64B1DF81B3A356001BF0DF4E02A1FC59F651C9D585EC6224BB279C6BEBA2966E8882D68376081B987468E7AED1EF90EBD090AE825795CDCA1B4F09A979C8DFC21A48D8A53CDBB26C4DB547FC06EFE2F9850EDD2685A4661CB4911F165D4B63EF25B87D0A96D3DFF6AB0758999AAD214D07BD4F133A6734FDE445FE474711B69A98F7E2B
 *         Squeezed = 558003DE96ACABA616A73027DFE205C8D011A90F9E12A0751E86DD1A3F11569520B1FAF0455343937697693B6095DE0646111B4865EB2587EABA56A25459045A29DC6AB3
 * 
 * Since this implementation is little-endian, the corresponding Javascript is:
 * 
 *     keccak32("");
 *         "2507dc4976767add735f22c1831fbf323cb9f94755c289a680b327adff881fcd"
 *     keccak32("\ufb41");
 *         "dccdef818ceefe1cb20af60aafbf836d889462ac1a1bceb756648b6b5cae991b"
 *     keccak32("\uC5B3\u4BE7\u9369\u253C\u1033\u566C\u4C3B\u02A2\uF238\uE6B6\uE875\u1E68\uA334\u8989\u8547\uADBD\u96E5\uD452\u3DA7\uA580\u5BC8\u54D4\u1EFD\uFD9F\u1CAD\u1538\u03F5\u9E8E\u32F4\uC5AA\uC4C3\u84FE\uC30C\uCF70\u5886\u600A\u7711\uBE8B\uF5DA\uA511\u561B\uA2D1\u68EB\u4A39\u99A2\u6DE2\uADA9\uA2A6\u9BF3\uAF9F\uFBF7\u57A4\u9B68\u1A9C\u7B57\u1E2A\u5F50\u75DF\uA0C7\u4BA6\uF81D\u3A1B\u6035\uBF01\uF40D\u2AE0\uC51F\u659F\u9D1C\u5E58\u22C6\uB24B\uC679\uBABE\u6629\u88E8\u682D\u6037\uB981\u4687\u7A8E\u1EED\u0EF9\u09BD\uE80A\u7925\uDC5C\uB4A1\u9AF0\u9C97\uFC8D\uA421\u8A8D\uCD53\u26BB\uDBC4\u7F54\u6EC0\u2FFE\u5098\uD2ED\u5A68\u6146\u49CB\uF111\uD465\u3EB6\u5BF2\uD087\u6DA9\uFF3D\uB06A\u8975\uAA99\u14D2\u7BD0\uF1D4\uA633\u4F73\u44DE\uE45F\u7174\u691B\u8FA9\u2B7E");
 *         "558003de96acaba616a73027dfe205c8d011a90f9e12a0751e86dd1a3f115695"
 * 
 * This function was written by Chris Drost of drostie.org, and he hereby dedicates it into the 
 * public domain: it has no copyright. It is provided with NO WARRANTIES OF ANY KIND. 
 * I do humbly request that you provide me some sort of credit if you use it; but I leave that 
 * choice up to you.
 */

var Keccak32 = (function () {
  "use strict";
  var permute, RC, r, circ, hex, output_fn, run, doRounds;
  permute = [0, 10, 20, 5, 15, 16, 1, 11, 21, 6, 7, 17, 2, 12, 22, 23, 8, 18, 3, 13, 14, 24, 9, 19, 4];
  RC = "1,8082,808a,80008000,808b,80000001,80008081,8009,8a,88,80008009,8000000a,8000808b,8b,8089,8003,8002,80,800a,8000000a,80008081,8080"
    .split(",").map(function (i) { 
      return parseInt(i, 16); 
    });
  r = [0, 1, 30, 28, 27, 4, 12, 6, 23, 20, 3, 10, 11, 25, 7, 9, 13, 15, 21, 8, 18, 2, 29, 24, 14];
  circ = function (s, n) {
    return (s << n) | (s >>> (32 - n));
  };
  hex = function (n) {
    return ("00" + n.toString(16)).slice(-2);
  };
  output_fn = function (n) {
    return hex(n & 255) + hex(n >>> 8) + hex(n >>> 16) + hex(n >>> 24);
  };
  run = function (m) {
    var i, b, k, x, y, C, D, round, next, state;
    state = new Uint32Array(25);
    for (i = 0; i < 25; i += 1) {
      state[i] = 0;
    }
    C = [];
    D = [];
    next = [];
    if (m.length % 16 === 15) {
      m+="\u8001";
    } else {
      m += "\x01";
      while (m.length % 16 !== 15) {
        m += "\0";
      }
      m+="\u8000";
    }
    for (b = 0; b < m.length; b += 16) {
      for (k = 0; k < 16; k += 2) {
        state[k / 2] ^= m.charCodeAt(b + k) + m.charCodeAt(b + k + 1) * 65536;
      }
      for (round = 0; round < 22; round += 1) {
        for (x = 0; x < 5; x += 1) {
          C[x] = state[x] ^ state[x + 5] ^ state[x + 10] ^ state[x + 15] ^ state[x + 20]; 
        }
        for (x = 0; x < 5; x += 1) {
          D[x] = C[(x + 4) % 5] ^ circ(C[(x + 1) % 5], 1);
        }
        for (i = 0; i < 25; i += 1) {
          next[permute[i]] = circ(state[i] ^ D[i % 5], r[i]);
        }
        for (x = 0; x < 5; x += 1) {
          for (y = 0; y < 25; y += 5) {
            state[y + x] = next[y + x] ^ ((~ next[y + (x + 1) % 5]) & (next[y + (x + 2) % 5]));
          }
        }
        state[0] ^= RC[round];
      }
    }
    return Array.apply([], state.subarray(0, 8)).map(output_fn).join("");
  };
  function Keccak32(roh, capacity, rounds) {
    this.roh = roh;
    this.rohb = roh/8;
    this.capacity = capacity;
    this.rounds = rounds;
    this.state = new ArrayBuffer(100);
    this.state32 = new Uint32Array(this.state);
    this.state8 = new Uint8Array(this.state);
    this.C = new Uint32Array(25);
    this.D = new Uint32Array(25);
    this.next = new Uint32Array(25);
    this.reset();

    var r = 800 - capacity;
    this.lastR = Math.ceil(r/8.0) - 1;

    var pad = r - roh;
    // When pad = 0, do like above
    this.first = 0x01;
    this.last = 0x80;
    this.single = 0x81;
  }

  Keccak32.prototype.reset = function () {
    var state = new Uint32Array(this.state);
    for (var i = 0; i < state.length; i++) {
      state[i] = 0;
    }
  };

  Keccak32.prototype.absorb = function (input, l) {
    // TODO(bharrisau) include bit padding
    var b, k, rohb, remain, state, lastR;
    rohb = this.rohb;
    lastR = this.lastR;
    state = this.state8;
    // length + 1 byte for padding
    remain = input.length + 1;
    for (b = 0; remain > 0; b += rohb) {
      for (k = 0; k < rohb && remain > 1; k++, remain--) {
        state[k] ^= input[b+k];
      }
      // When only padding byte left, and room in r
      if (remain == 1 && k <= lastR) {
        // Only a padding byte left
        remain = 0;
        if (k == lastR) {
          state[k] ^= this.single;
        } else {
          state[k] ^= this.first;
          state[lastR] ^= this.last;
        }
      }
      this.doRounds();
    }
    return state.subarray(0, l);
  };
  Keccak32.prototype.squeeze = function (into) {
    var state = new Uint8Array(this.state);
    into.set(state.subarray(0, into.length));
    this.doRounds(this.rounds);
  };
  Keccak32.prototype.doRounds = function () {
    var x, i, y, C, D, next, state, round, rounds;
    C = this.C;
    D = this.D;
    next = this.next;
    rounds = this.rounds;
    state = this.state32;
    
    for (round = 0; round < rounds; round++) {
      for (x = 0; x < 5; x += 1) {
        C[x] = state[x] ^ state[x + 5] ^ state[x + 10] ^ state[x + 15] ^ state[x + 20]; 
      }
      for (x = 0; x < 5; x += 1) {
        D[x] = C[(x + 4) % 5] ^ circ(C[(x + 1) % 5], 1);
      }
      for (i = 0; i < 25; i += 1) {
        next[permute[i]] = circ(state[i] ^ D[i % 5], r[i]);
      }
      for (x = 0; x < 5; x += 1) {
        for (y = 0; y < 25; y += 5) {
          state[y + x] = next[y + x] ^ ((~ next[y + (x + 1) % 5]) & (next[y + (x + 2) % 5]));
        }
      }
      state[0] ^= RC[round];
    }
  };        
  return Keccak32;
}());
var test = function() {
  var b, c, d, i;
  var a = new Keccak32(256, 544, 22);
 /*     ShortMsgKAT_r256c544.txt
 *         Len = 0
 *         Msg = 00
 *         Squeezed = 2507DC4976767ADD735F22C1831FBF323CB9F94755C289A680B327ADFF881FCD5D9B3816314C55AB80881001B833C5BD02E8AC5359B07C27ACDFBB64ABE8738451AA7049
 *         ...
 *         Len = 16
 *         Msg = 41FB
 *         Squeezed = DCCDEF818CEEFE1CB20AF60AAFBF836D889462AC1A1BCEB756648B6B5CAE991B2C7C8976BA791CB69E8254ADAE50FD7A0F0AADB2546A45C55F7824EBD4A48998C09A69E7
 */
  b = new Uint8Array(0);
  c = a.absorb(b, 32);
  d = [0x25, 0x07, 0xDC, 0x49, 0x76, 0x76, 0x7A, 0xDD,
      0x73, 0x5F, 0x22, 0xC1, 0x83, 0x1F, 0xBF, 0x32,
      0x3C, 0xB9, 0xF9, 0x47, 0x55, 0xC2, 0x89, 0xA6,
      0x80, 0xB3, 0x27, 0xAD, 0xFF, 0x88, 0x1F, 0xCD];
  for (i = 0; i < c.length; i++) {
    if (c[i] != d[i]) {
      console.log("Validation error");
      return false;
    }
  }


  a.reset();
  b = new Uint8Array([0x41, 0xFB]);
  //b[0] = 0x41;
  //b[1] = 0xFB;
  c = a.absorb(b, 32);
  d = [0xDC, 0xCD, 0xEF, 0x81, 0x8C, 0xEE, 0xFE, 0x1C,
      0xB2, 0x0A, 0xF6, 0x0A, 0xAF, 0xBF, 0x83, 0x6D,
      0x88, 0x94, 0x62, 0xAC, 0x1A, 0x1B, 0xCE, 0xB7,
      0x56, 0x64, 0x8B, 0x6B, 0x5C, 0xAE, 0x99, 0x1B];
  for (i = 0; i < c.length; i++) {
    if (c[i] != d[i]) {
      console.log("Validation error");
      return false;
    }
  }

  b = new Uint8Array([0xB3, 0xC5, 0xE7, 0x4B, 0x69, 0x93, 0x3C, 0x25,
      0x33, 0x10, 0x6C, 0x56, 0x3B, 0x4C, 0xA2, 0x02,
      0x38, 0xF2, 0xB6, 0xE6, 0x75, 0xE8, 0x68, 0x1E,
      0x34, 0xA3, 0x89, 0x89, 0x47, 0x85, 0xBD, 0xAD,
      0xE5, 0x96, 0x52, 0xD4, 0xA7, 0x3D, 0x80, 0xA5,
      0xC8, 0x5B, 0xD4, 0x54, 0xFD, 0x1E, 0x9F, 0xFD,
      0xAD, 0x1C, 0x38, 0x15, 0xF5, 0x03, 0x8E, 0x9E,
      0xF4, 0x32, 0xAA, 0xC5, 0xC3, 0xC4, 0xFE, 0x84,
      0x0C, 0xC3, 0x70, 0xCF, 0x86, 0x58, 0x0A, 0x60,
      0x11, 0x77, 0x8B, 0xBE, 0xDA, 0xF5, 0x11, 0xA5,
      0x1B, 0x56, 0xD1, 0xA2, 0xEB, 0x68, 0x39, 0x4A,
      0xA2, 0x99, 0xE2, 0x6D, 0xA9, 0xAD, 0xA6, 0xA2,
      0xF3, 0x9B, 0x9F, 0xAF, 0xF7, 0xFB, 0xA4, 0x57,
      0x68, 0x9B, 0x9C, 0x1A, 0x57, 0x7B, 0x2A, 0x1E,
      0x50, 0x5F, 0xDF, 0x75, 0xC7, 0xA0, 0xA6, 0x4B,
      0x1D, 0xF8, 0x1B, 0x3A, 0x35, 0x60, 0x01, 0xBF,
      0x0D, 0xF4, 0xE0, 0x2A, 0x1F, 0xC5, 0x9F, 0x65,
      0x1C, 0x9D, 0x58, 0x5E, 0xC6, 0x22, 0x4B, 0xB2,
      0x79, 0xC6, 0xBE, 0xBA, 0x29, 0x66, 0xE8, 0x88,
      0x2D, 0x68, 0x37, 0x60, 0x81, 0xB9, 0x87, 0x46,
      0x8E, 0x7A, 0xED, 0x1E, 0xF9, 0x0E, 0xBD, 0x09,
      0x0A, 0xE8, 0x25, 0x79, 0x5C, 0xDC, 0xA1, 0xB4,
      0xF0, 0x9A, 0x97, 0x9C, 0x8D, 0xFC, 0x21, 0xA4,
      0x8D, 0x8A, 0x53, 0xCD, 0xBB, 0x26, 0xC4, 0xDB,
      0x54, 0x7F, 0xC0, 0x6E, 0xFE, 0x2F, 0x98, 0x50,
      0xED, 0xD2, 0x68, 0x5A, 0x46, 0x61, 0xCB, 0x49,
      0x11, 0xF1, 0x65, 0xD4, 0xB6, 0x3E, 0xF2, 0x5B,
      0x87, 0xD0, 0xA9, 0x6D, 0x3D, 0xFF, 0x6A, 0xB0,
      0x75, 0x89, 0x99, 0xAA, 0xD2, 0x14, 0xD0, 0x7B,
      0xD4, 0xF1, 0x33, 0xA6, 0x73, 0x4F, 0xDE, 0x44,
      0x5F, 0xE4, 0x74, 0x71, 0x1B, 0x69, 0xA9, 0x8F,
      0x7E, 0x2B]);
  a.reset();
  c = a.absorb(b, 32);
  d = [0x55, 0x80, 0x03, 0xDE, 0x96, 0xAC, 0xAB, 0xA6,
    0x16, 0xA7, 0x30, 0x27, 0xDF, 0xE2, 0x05, 0xC8,
    0xD0, 0x11, 0xA9, 0x0F, 0x9E, 0x12, 0xA0, 0x75,
    0x1E, 0x86, 0xDD, 0x1A, 0x3F, 0x11, 0x56, 0x95];

  for (i = 0; i < c.length; i++) {
    if (c[i] != d[i]) {
      console.log("Validation error");
      return false;
    }
  }

  // catena test "", [], [], 5
  // 245,181,61,7,184,69,252,170,87,83,82,224,90,235,49,210,221,168,28,198,4,11,187,240,12,195,122,154,74,70,253,144

  // catena test "abc", [0, 0, 0], [1, 2, 3], 5
  // 97,28,21,93,125,176,34,34,129,219,223,0,67,205,155,167,63,97,147,157,111,82,73,191,77,235,232,54,140,65,163,223

  console.log("Validation succeeded");
  return true;
};
