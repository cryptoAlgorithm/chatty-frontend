import React, {Component, createRef} from 'react';
import {ThemeCtx} from '../components/core/UIThemeProvider';
import OutlinedTextField from '../components/base/OutinedTextField';
import InputBase from '../components/base/InputBase';
import Button from '../components/base/Button';
import {login} from '../cryptoBase/auth';
import ReCAPTCHA from 'react-google-recaptcha';
import mainConf from '../dev/config/masterConfig';
import Container from '../components/base/Container';
import {RouteComponentProps, withRouter} from 'react-router-dom';
import Centered from '../components/utility/Centered';
import Typography from '../components/complex/Typography';
import chattyIcon from '../assets/img/chattyIcon.png';
import HorizontalPager from '../components/complex/HorizontalPager';
import styled from 'styled-components';
import delay from '../utils/delay';

interface LoginState {
    username: string;
    password: string;
    vaultPw: string;
    loginErr?: string;
    handle: string;
    pagerPage: number;
}

const ActionBtnRow = styled.div`
  display: flex;
  gap: .75rem;
  justify-content: flex-end;
  margin: 1rem 0;
`
const FlexFiller = styled.div`
  flex-grow: 1;
`

const loginHeaderContentLookup = [
    ['Sign in', 'Use your Chatty username & password'],
    ['Hello!', 'As always, keep passwords to yourself'],
    ['Are you a robot?', 'This helps ensure you\'re a human'],
    ['Just a moment', 'We\'re signing you in…']
]

/**
 * Login page - Handles the whole user sign-in/up flow,
 * with Google-inspired UI and a spring animated viewpager
 */
class Login extends Component<RouteComponentProps, LoginState> {
    static contextType = ThemeCtx;
    private reCaptcha = createRef<ReCAPTCHA>();

    constructor(props: RouteComponentProps) {
        super(props);

        this.state = {
            username: '',
            password: '',
            vaultPw: '',
            handle: '',
            pagerPage: 0,
        }

        this.handleLogin = this.handleLogin.bind(this);
        this.setPg = this.setPg.bind(this);
    }

    componentDidMount() {
        document.title = 'Chatty - Login'
    }

    private setPg(page: number) {
        this.setState({pagerPage: page})
    }

    async captcha() {
        let times = 0;
        const id = setInterval(() => {
            if (times >= 10) clearInterval(id);
            // Force nicer styling for recaptcha
            document.querySelectorAll('iframe[title="recaptcha challenge"]')?.forEach(e => {
                const elem = e
                    .parentElement
                    ?.previousSibling as HTMLElement
                if (!elem) return;
                elem.style.backgroundColor = '#000';
                const container = e.parentElement as HTMLElement;
                container.style.borderRadius = '10px';
                container.style.overflow = 'hidden';
            });
            times++;
        }, 50);
        return this.reCaptcha.current?.executeAsync();
    }

    async handleLogin(signUp = false) {
        console.log('Waiting for captcha')
        if (this.reCaptcha.current?.getValue()) this.reCaptcha.current?.reset()
        const captchaToken = await this.captcha()
        if (!captchaToken) {
            this.setState({loginErr: 'ReCAPTCHA error'});
            return;
        }

        await delay(2000);
        this.setPg(3);
        const err = await login(this.state.username, this.state.password, captchaToken!, signUp, this.state.handle);
        if (err) {
            if (err.reason === 'invalid-cred') this.setState({loginErr: 'Please ensure your email and passwords are correct'});
            this.setPg(0);
            return;
        }
        else {
            this.props.history.push('/app')
        }
    }

    render() {
        return <Centered>
            <Container variant='outlined'
                       style={{width: 400, maxWidth: 'calc(100vw - 5rem)', height: 450, margin: '2rem', paddingTop: '1.5rem'}}>
                <Centered vertical={false}>
                    <img src={chattyIcon} alt='Chatty' style={{width: 64, height: 64, borderRadius: 14}} />
                    <Typography variant='h2' textAlign='center' marginTop='1.5rem' marginBottom='.5rem'>
                        {loginHeaderContentLookup[this.state.pagerPage][0]}
                    </Typography>
                    <Typography variant='body' textAlign='center' marginTop={0}>
                        {loginHeaderContentLookup[this.state.pagerPage][1]}
                    </Typography>
                </Centered>


                <HorizontalPager page={this.state.pagerPage} marginLeft='-1rem' width={432}>
                    <>
                        <OutlinedTextField>
                            <InputBase placeholder='Username' type='email' value={this.state.username}
                                       onKeyDown={({key}) => key === 'Enter' ? this.setPg(1) : 0}
                                       onChange={e => this.setState({username: e.currentTarget.value})} />
                        </OutlinedTextField>

                        <Typography variant='p' margin='2rem 0'>
                            Always ensure you're logging into Chatty at chattyapp.cf
                            to prevent attackers from gaining access to your account.
                        </Typography>

                        <ActionBtnRow>
                            <Button onclick={() => this.setPg(0)}>Create Account</Button>
                            <FlexFiller />
                            <Button filled onclick={() => this.setPg(1)}>Next</Button>
                        </ActionBtnRow>

                        <Typography variant='body' color='red'>{this.state.loginErr}</Typography>
                    </>
                    <>
                        <OutlinedTextField>
                            <InputBase placeholder='Account Password' type='password' value={this.state.password}
                                       onChange={e => this.setState({password: e.currentTarget.value})} />
                        </OutlinedTextField>
                        <OutlinedTextField marginTop='.75rem'>
                            <InputBase placeholder='Vault Password' type='password' value={this.state.vaultPw}
                                       onChange={e => this.setState({vaultPw: e.currentTarget.value})} />
                        </OutlinedTextField>
                        <Typography variant='subtitle' paddingBottom='.2rem' paddingTop='.2rem' display='flex'>
                            Leave this field blank if your vault password is the same as your account password
                        </Typography>

                        <ActionBtnRow>
                            <Button onclick={() => this.setPg(0)}>Back</Button>
                            <FlexFiller />
                            <Button filled onclick={() => {
                                this.setPg(2);
                                this.handleLogin().then();
                            }}>Sign In</Button>
                        </ActionBtnRow>
                    </>
                    <>
                        <IconSwapperWithProgress />
                        <Typography variant='body'>Please complete the reCAPTCHA challenge if requested</Typography>
                    </>
                    <>
                        <Typography variant='body'>Just a moment, we're signing you in&hellip;</Typography>
                    </>
                </HorizontalPager>

            </Container>

            <ReCAPTCHA ref={this.reCaptcha} sitekey={mainConf.reCAPTCHAKey} theme='dark'
                       onErrored={() => this.setState({loginErr: 'ReCAPTCHA network problem'})} size='invisible' />
        </Centered>
    }
}

export default withRouter(Login);


function IconSwapperWithProgress() {
    return <>

    </>
}