package sqlast

import "strings"

type Lexer struct {
	input  []rune
	pos    int
	line   int
}

func NewLexer(input string) *Lexer {
	return &Lexer{input: []rune(input), pos: 0, line: 1}
}

func (l *Lexer) peek() rune {
	if l.pos >= len(l.input) {
		return 0
	}
	return l.input[l.pos]
}

func (l *Lexer) advance() rune {
	ch := l.input[l.pos]
	l.pos++
	if ch == '\n' {
		l.line++
	}
	return ch
}

func (l *Lexer) skipWhitespaceAndComments() {
	for l.pos < len(l.input) {
		ch := l.peek()
		if ch == ' ' || ch == '\t' || ch == '\r' || ch == '\n' {
			l.advance()
			continue
		}
		if ch == '-' && l.pos+1 < len(l.input) && l.input[l.pos+1] == '-' {
			for l.pos < len(l.input) && l.peek() != '\n' {
				l.advance()
			}
			continue
		}
		if ch == '/' && l.pos+1 < len(l.input) && l.input[l.pos+1] == '*' {
			l.advance()
			l.advance()
			for l.pos < len(l.input) {
				if l.peek() == '*' && l.pos+1 < len(l.input) && l.input[l.pos+1] == '/' {
					l.advance()
					l.advance()
					break
				}
				l.advance()
			}
			continue
		}
		break
	}
}

func (l *Lexer) readString(quote rune) Token {
	line := l.line
	var sb strings.Builder
	for l.pos < len(l.input) {
		ch := l.advance()
		if ch == quote {
			if l.pos < len(l.input) && l.peek() == quote {
				l.advance()
				sb.WriteRune(quote)
				continue
			}
			break
		}
		sb.WriteRune(ch)
	}
	return Token{Type: STRING, Literal: sb.String(), Line: line}
}

func (l *Lexer) readIdent() Token {
	line := l.line
	start := l.pos
	for l.pos < len(l.input) {
		ch := l.peek()
		if (ch >= 'a' && ch <= 'z') || (ch >= 'A' && ch <= 'Z') ||
			(ch >= '0' && ch <= '9') || ch == '_' || ch > 127 {
			l.advance()
		} else {
			break
		}
	}
	lit := string(l.input[start:l.pos])
	lower := strings.ToLower(lit)
	if tt, ok := keywords[lower]; ok {
		return Token{Type: tt, Literal: lit, Line: line}
	}
	return Token{Type: IDENT, Literal: lit, Line: line}
}

func (l *Lexer) readNumber() Token {
	line := l.line
	start := l.pos
	for l.pos < len(l.input) {
		ch := l.peek()
		if (ch >= '0' && ch <= '9') || ch == '.' {
			l.advance()
		} else {
			break
		}
	}
	return Token{Type: NUMBER, Literal: string(l.input[start:l.pos]), Line: line}
}

func (l *Lexer) NextToken() Token {
	l.skipWhitespaceAndComments()
	if l.pos >= len(l.input) {
		return Token{Type: EOF, Line: l.line}
	}
	line := l.line
	ch := l.peek()

	switch {
	case ch == '\'' :
		l.advance()
		return l.readString('\'')
	case ch == '"':
		l.advance()
		return l.readString('"')
	case ch == '`':
		l.advance()
		return l.readString('`')
	case ch == ';':
		l.advance()
		return Token{Type: SEMICOLON, Literal: ";", Line: line}
	case ch == '(':
		l.advance()
		return Token{Type: LPAREN, Literal: "(", Line: line}
	case ch == ')':
		l.advance()
		return Token{Type: RPAREN, Literal: ")", Line: line}
	case ch == ',':
		l.advance()
		return Token{Type: COMMA, Literal: ",", Line: line}
	case ch == '.':
		l.advance()
		return Token{Type: DOT, Literal: ".", Line: line}
	case ch == '=':
		l.advance()
		return Token{Type: EQ, Literal: "=", Line: line}
	case ch == '[':
		l.advance()
		return Token{Type: LBRACKET, Literal: "[", Line: line}
	case ch == ']':
		l.advance()
		return Token{Type: RBRACKET, Literal: "]", Line: line}
	case (ch >= 'a' && ch <= 'z') || (ch >= 'A' && ch <= 'Z') || ch == '_' || ch > 127:
		return l.readIdent()
	case ch >= '0' && ch <= '9':
		return l.readNumber()
	default:
		l.advance()
		return Token{Type: ILLEGAL, Literal: string(ch), Line: line}
	}
}

func Tokenize(input string) []Token {
	l := NewLexer(input)
	var tokens []Token
	for {
		tok := l.NextToken()
		tokens = append(tokens, tok)
		if tok.Type == EOF {
			break
		}
	}
	return tokens
}
